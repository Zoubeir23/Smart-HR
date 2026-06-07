import logging

from django.db.models import Count
from rest_framework import filters
from rest_framework import serializers as drf_serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.core.email_service import send_employee_credentials_email
from smart_hr.core.models import AuditLog
from smart_hr.core.models import log_audit_action
from smart_hr.personnel.models import Employee
from smart_hr.personnel.serializers import EmployeeSelfSerializer
from smart_hr.personnel.serializers import EmployeeSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class AvailableUserSerializer(drf_serializers.ModelSerializer):
    """Expose les utilisateurs sans fiche employé (pour la création d'employé)."""

    full_name = drf_serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "full_name", "role"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.email


class EmployeeViewSet(viewsets.ModelViewSet):
    """API CRUD des employés avec règles RBAC et endpoints métier."""

    serializer_class = EmployeeSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["user__first_name", "user__last_name", "user__email", "cin"]
    ordering_fields = ["hire_date", "salary"]

    def get_queryset(self):
        """Retourne les employés visibles selon le rôle de l'utilisateur connecté."""
        user = self.request.user
        qs = Employee.objects.select_related("user", "department", "position").order_by("id")
        if user.role in [User.Role.ADMIN, User.Role.RH]:
            return qs
        return qs.filter(user=user)

    def get_serializer_class(self):
        """Utilise le serializer restreint pour les employés non-RH."""
        user = self.request.user
        if user.role in [User.Role.ADMIN, User.Role.RH]:
            return EmployeeSerializer
        return EmployeeSelfSerializer

    def get_permissions(self):
        """Applique des permissions plus strictes pour les actions d'écriture."""
        if self.action in ["list", "retrieve", "me"]:
            return [IsAuthenticated()]
        return [IsRH()]

    def perform_create(self, serializer):
        """Crée l'employé puis envoie ses identifiants par email."""
        employee = serializer.save()
        employee_user = employee.user

        # Le mot de passe en clair n'est plus accessible après hashage —
        # on envoie un mot de passe temporaire généré ici et on le définit.
        import secrets

        temp_password = secrets.token_urlsafe(10)
        employee_user.set_password(temp_password)
        employee_user.save(update_fields=["password"])

        try:
            send_employee_credentials_email(
                employee_email=employee_user.email,
                first_name=employee_user.first_name or "",
                last_name=employee_user.last_name or "",
                temp_password=temp_password,
                role=employee_user.role,
            )
        except Exception:
            logger.exception(
                "Échec de l'envoi de l'email d'identifiants pour %s",
                employee_user.email,
            )

    def perform_destroy(self, instance: Employee) -> None:
        """Supprime l'employé et crée un log d'audit traçable."""
        log_audit_action(
            performed_by=self.request.user,
            action=AuditLog.Action.DELETE,
            model_name="Employee",
            object_id=str(instance.pk),
            object_repr=str(instance),
            details={
                "email": instance.user.email,
                "salary": str(instance.salary),
                "department": instance.department.name if instance.department else None,
            },
        )
        instance.delete()

    def perform_update(self, serializer: EmployeeSerializer) -> None:
        """Met à jour l'employé et logue les modifications de salaire."""
        old_salary = serializer.instance.salary
        updated_employee = serializer.save()
        new_salary = updated_employee.salary

        if old_salary != new_salary:
            log_audit_action(
                performed_by=self.request.user,
                action=AuditLog.Action.UPDATE,
                model_name="Employee",
                object_id=str(updated_employee.pk),
                object_repr=str(updated_employee),
                details={
                    "champ": "salary",
                    "ancienne_valeur": str(old_salary),
                    "nouvelle_valeur": str(new_salary),
                },
            )

    @action(detail=False, methods=["get"])
    def me(self, request):
        """Retourne le profil employé de l'utilisateur connecté."""
        try:
            employee = Employee.objects.select_related(
                "user",
                "department",
                "position",
            ).get(user=request.user)
            serializer = self.get_serializer(employee)
            return Response(serializer.data)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Profil employé non trouvé pour cet utilisateur."},
                status=status.HTTP_404_NOT_FOUND,
            )

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """KPIs globaux sur les employés (réservé RH/Admin)."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        total = Employee.objects.count()
        by_status = {s: Employee.objects.filter(status=s).count() for s in ["active", "inactive", "on_leave"]}
        by_department = list(
            Employee.objects.values("department__name").annotate(count=Count("id")).order_by("-count"),
        )
        high_churn_risk = Employee.objects.filter(churn_risk__gte=70).count()

        return Response(
            {
                "total_employees": total,
                "by_status": by_status,
                "by_department": by_department,
                "high_churn_risk": high_churn_risk,
            },
        )

    @action(detail=False, methods=["get"], url_path="available-users")
    def available_users(self, request):
        """Retourne les utilisateurs sans profil employé (pour la création d'employé). Réservé RH/Admin."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        existing_employee_user_ids = Employee.objects.values_list("user_id", flat=True)
        users = User.objects.exclude(id__in=existing_employee_user_ids).order_by(
            "first_name",
            "last_name",
        )

        serializer = AvailableUserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="retention-stats")
    def retention_stats(self, request):
        """Statistiques de rétention par mois (réservé RH/Admin)."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        from django.db.models.functions import TruncMonth
        from django.utils import timezone

        cutoff = timezone.now() - timezone.timedelta(days=365)
        monthly = (
            Employee.objects.filter(created_at__gte=cutoff)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(new_hires=Count("id"))
            .order_by("month")
        )

        data = [
            {
                "month": entry["month"].strftime("%Y-%m"),
                "new_hires": entry["new_hires"],
            }
            for entry in monthly
        ]
        return Response({"retention_stats": data})
