import logging
import secrets

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
from smart_hr.users.permissions import IsRHOrDepartmentManager

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
        return [IsRHOrDepartmentManager()]

    def perform_create(self, serializer):
        """Crée l'employé puis envoie ses identifiants par email."""
        employee = serializer.save()
        employee_user = employee.user

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

    @action(detail=True, methods=["post"], url_path="set-manager")
    def set_manager(self, request, pk=None):
        """
        POST /api/v1/personnel/employees/{id}/set-manager/
        Nomme ou retire le statut de manager de département (Admin/RH uniquement).
        Body : {"is_manager": true} ou {"is_manager": false}
        """
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        employee = self.get_object()
        is_manager = request.data.get("is_manager")

        if is_manager is None:
            return Response(
                {"detail": "Le champ 'is_manager' (true/false) est obligatoire."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not isinstance(is_manager, bool):
            return Response(
                {"detail": "Le champ 'is_manager' doit être un booléen (true ou false)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if is_manager and not employee.department:
            return Response(
                {"detail": "Impossible de nommer manager un employé sans département assigné."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee.is_department_manager = is_manager
        employee.save(update_fields=["is_department_manager", "updated_at"])

        action_label = "nommé manager" if is_manager else "retiré du poste de manager"
        logger.info("Employé %s %s par %s", employee.pk, action_label, request.user.email)

        serializer = self.get_serializer(employee)
        return Response(serializer.data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """KPIs globaux sur les employés (réservé RH/Admin)."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        from smart_hr.conge.models import LeaveRequest
        from smart_hr.recruitment.models import Application
        from smart_hr.recruitment.models import JobOffer

        total = Employee.objects.count()
        by_status = {s: Employee.objects.filter(status=s).count() for s in ["active", "inactive", "on_leave"]}
        by_department = list(
            Employee.objects.values("department__name").annotate(count=Count("id")).order_by("-count"),
        )
        high_churn_risk = Employee.objects.filter(churn_risk__gte=70).count()
        pending_leaves = LeaveRequest.objects.filter(status=LeaveRequest.Status.PENDING).count()
        open_positions = JobOffer.objects.filter(status=JobOffer.Status.OPEN).count()
        new_applications = Application.objects.filter(status=Application.Status.PENDING).count()

        return Response(
            {
                "total_employees": total,
                # Champs à plat consommés par le dashboard frontend (DashboardStats).
                "active_employees": by_status["active"],
                "pending_leaves": pending_leaves,
                "open_positions": open_positions,
                "new_applications": new_applications,
                "churn_risk_high": high_churn_risk,
                # Champs détaillés conservés pour les autres consommateurs.
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

    @action(detail=True, methods=["post"], url_path="anonymize")
    def anonymize(self, request, pk=None):
        """
        POST /api/v1/personnel/employees/{id}/anonymize/
        RGPD droit a l'oubli : anonymise les donnees personnelles d'un ancien employe
        inactif. Seuls les donnees RH agreg (historique paiement, anciennete) sont preservees.
        Reserve aux Admin uniquement.
        """
        from smart_hr.users.models import User

        if request.user.role != User.Role.ADMIN:
            return Response(status=status.HTTP_403_FORBIDDEN)

        employee = self.get_object()

        if employee.status not in {Employee.Status.INACTIVE, Employee.Status.TERMINATED}:
            return Response(
                {"detail": "Seuls les employes inactifs ou termines peuvent etre anonymises."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if employee.anonymized:
            return Response(
                {"detail": "Cet employe a deja ete anonymise."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee_user = employee.user
        original_repr = str(employee)

        employee.cin = ""
        employee.address = ""
        employee.nationality = None
        employee.date_of_birth = None
        employee.emergency_contact = ""
        employee.anonymized = True
        employee.save(
            update_fields=[
                "cin",
                "address",
                "nationality",
                "date_of_birth",
                "emergency_contact",
                "anonymized",
                "updated_at",
            ],
        )

        employee_user.first_name = f"Employe_{employee.pk}"
        employee_user.last_name = "[anonymise]"
        employee_user.tel = ""
        employee_user.save(update_fields=["first_name", "last_name", "tel"])

        # Cascade RGPD : anonymiser les données personnelles dans les relations
        from smart_hr.conge.models import LeaveRequest

        LeaveRequest.objects.filter(employee=employee).update(reason="[anonymise]")

        try:
            from smart_hr.presence.models import Attendance

            Attendance.objects.filter(employee=employee).update(notes="[anonymise]")
        except Exception:
            pass

        try:
            from smart_hr.paiement.models import Payroll

            Payroll.objects.filter(employee=employee).update(notes="[anonymise]")
        except Exception:
            pass

        log_audit_action(
            performed_by=request.user,
            action=AuditLog.Action.DELETE,
            model_name="Employee",
            object_id=str(employee.pk),
            object_repr=original_repr,
            details={"raison": "Anonymisation RGPD", "status": employee.status},
        )

        logger.info("Employe %s anonymise (RGPD) par %s", employee.pk, request.user.email)

        return Response(
            {"detail": "Donnees personnelles anonymisees avec succes.", "id": employee.pk},
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["get"], url_path="export", permission_classes=[IsRHOrDepartmentManager])
    def export(self, request):
        """Export CSV ou XLSX de la liste des employés (RH/Admin uniquement).

        Query params : format=csv (défaut) | xlsx
        """
        from smart_hr.core.export_utils import export_response

        export_format = request.query_params.get("format", "csv").lower()
        queryset = self.get_queryset().select_related("user", "department", "position", "service")

        rows = [
            {
                "ID": employee.pk,
                "Prénom": employee.user.first_name,
                "Nom": employee.user.last_name,
                "Email": employee.user.email,
                "Téléphone": getattr(employee.user, "tel", "") or "",
                "Département": employee.department.name if employee.department else "",
                "Service": employee.service.name if employee.service else "",
                "Poste": employee.position.title if employee.position else "",
                "Statut": employee.status,
                "Date d'embauche": str(employee.hire_date) if employee.hire_date else "",
                "Salaire de base": str(employee.salary) if employee.salary is not None else "",
                "CIN": employee.cin or "",
            }
            for employee in queryset
        ]

        return export_response(rows, "employes", export_format, sheet_name="Employés")
