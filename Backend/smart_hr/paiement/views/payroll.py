import logging
from decimal import Decimal

from django.db import transaction
from django.db.models import Count
from django.db.models import Sum
from django.utils.timezone import now as timezone_now
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.core.email_service import send_payslip_paid_email
from smart_hr.paiement.models import Payroll
from smart_hr.paiement.serializers import PayrollBulkGenerateSerializer
from smart_hr.paiement.serializers import PayrollSerializer
from smart_hr.personnel.models import Employee
from smart_hr.users.permissions import IsRH
from smart_hr.users.permissions import IsRHOrDepartmentManager

logger = logging.getLogger(__name__)


class PayrollViewSet(viewsets.ModelViewSet):
    """Gestion complète des fiches de paie : CRUD, stats, bulk generate, notification."""

    serializer_class = PayrollSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__user__first_name", "employee__user__last_name", "month"]
    ordering_fields = ["month", "net_salary", "created_at"]
    ordering = ["-month"]

    def get_queryset(self):
        """Retourne toutes les paies pour RH/Admin, sinon celles de l'employé connecté.

        Utilise select_related pour éviter les requêtes N+1 sur employee__user et department.
        """
        user = self.request.user
        qs = Payroll.objects.select_related(
            "employee__user",
            "employee__department",
        )
        if user.role in ["ADMIN", "RH"]:
            # Filtres optionnels par query params pour RH/Admin
            month = self.request.query_params.get("month")
            employee_id = self.request.query_params.get("employee_id")
            dept_id = self.request.query_params.get("department_id")
            pay_status = self.request.query_params.get("status")

            if month:
                qs = qs.filter(month=month)
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            if dept_id:
                qs = qs.filter(employee__department_id=dept_id)
            if pay_status:
                qs = qs.filter(status=pay_status)
            return qs.all()

        # Employé : uniquement ses propres fiches
        return qs.filter(employee__user=user)

    def get_permissions(self):
        """Protège les actions d'écriture pour RH/Admin uniquement."""
        if self.action in ["create", "update", "partial_update", "destroy", "bulk_generate"]:
            return [IsRHOrDepartmentManager()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        """Envoie une notification e-mail quand une paie passe à l'état 'paid'."""
        old_status = serializer.instance.status
        payroll = serializer.save()

        if old_status != Payroll.Status.PAID and payroll.status == Payroll.Status.PAID:
            self._notify_employee_payslip_paid(payroll)

    @staticmethod
    def _compute_seniority_bonus(base_salary: Decimal, hire_date, reference_date) -> Decimal:
        """Calcule la prime d'ancienneté : 1 % du salaire brut par année, plafonnée à 15 %.

        Retourne 0 si hire_date est absent.
        """
        if not hire_date:
            return Decimal("0")
        years = (reference_date - hire_date).days // 365
        if years <= 0:
            return Decimal("0")
        rate = min(years, 15) * Decimal("0.01")
        return (base_salary * rate).quantize(Decimal("0.01"))

    def _notify_employee_payslip_paid(self, payroll: Payroll) -> None:
        """Notifie l'employé qu'une fiche de paie vient d'être réglée."""
        employee_user = payroll.employee.user
        try:
            send_payslip_paid_email(
                employee_email=employee_user.email,
                first_name=employee_user.first_name or "",
                last_name=employee_user.last_name or "",
                month=payroll.month,
                base_salary=str(payroll.base_salary),
                bonuses=str(payroll.bonuses),
                deductions=str(payroll.deductions),
                net_salary=str(payroll.net_salary),
            )
        except Exception:
            logger.exception(
                "Échec envoi email fiche de paie à %s pour le mois %s",
                employee_user.email,
                payroll.month,
            )

    @action(detail=True, methods=["post"], url_path="mark-paid")
    def mark_paid(self, request, pk=None):
        """Marque une fiche de paie comme payée et notifie l'employé (RH/Admin)."""
        payroll = self.get_object()
        if payroll.status == Payroll.Status.PAID:
            return Response(
                {"detail": "Cette fiche de paie est déjà marquée comme payée."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        payroll.status = Payroll.Status.PAID
        payroll.save(update_fields=["status", "updated_at"])
        self._notify_employee_payslip_paid(payroll)
        serializer = self.get_serializer(payroll)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path="bulk-generate")
    def bulk_generate(self, request):
        """Génère automatiquement des fiches de paie pour tous les employés actifs.

        Paramètres POST :
        - month (str): Format YYYY-MM obligatoire
        - department_id (int, optionnel): Limiter à un département

        Évite les doublons grâce à get_or_create.
        """
        serializer_input = PayrollBulkGenerateSerializer(data=request.data)
        serializer_input.is_valid(raise_exception=True)
        month = serializer_input.validated_data["month"]
        dept_id = serializer_input.validated_data.get("department_id")

        employees_qs = Employee.objects.filter(status=Employee.Status.ACTIVE).select_related(
            "user",
            "department",
        )
        if dept_id:
            employees_qs = employees_qs.filter(department_id=dept_id)

        created_count = 0
        skipped_count = 0
        reference_date = timezone_now().date()

        with transaction.atomic():
            for employee in employees_qs:
                seniority_bonus = self._compute_seniority_bonus(employee.salary, employee.hire_date, reference_date)
                _, created = Payroll.objects.get_or_create(
                    employee=employee,
                    month=month,
                    defaults={
                        "base_salary": employee.salary,
                        "bonuses": seniority_bonus,
                        "deductions": 0,
                        "status": Payroll.Status.PENDING,
                    },
                )
                if created:
                    created_count += 1
                else:
                    skipped_count += 1

        return Response(
            {
                "month": month,
                "created": created_count,
                "skipped_already_exists": skipped_count,
                "detail": (f"{created_count} fiche(s) créée(s), {skipped_count} déjà existante(s) pour {month}."),
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Statistiques de paie par mois (réservé RH/Admin).

        Query params :
        - month (str): Filtre sur un mois précis YYYY-MM
        """
        if request.user.role not in ["ADMIN", "RH"]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        month = request.query_params.get("month")
        qs = Payroll.objects.select_related("employee__department")
        if month:
            qs = qs.filter(month=month)

        total = qs.count()
        total_net = qs.aggregate(total=Sum("net_salary"))["total"] or 0

        by_status = {s: qs.filter(status=s).count() for s in ["pending", "processed", "paid"]}

        by_department = list(
            qs.values("employee__department__name")
            .annotate(count=Count("id"), total_net=Sum("net_salary"))
            .order_by("-total_net"),
        )

        return Response(
            {
                "month": month or "all",
                "total_payrolls": total,
                "total_net_salary": total_net,
                "by_status": by_status,
                "by_department": by_department,
            },
        )
