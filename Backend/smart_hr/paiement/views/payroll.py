import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.core.email_service import send_payslip_paid_email
from smart_hr.paiement.models import Payroll
from smart_hr.paiement.serializers import PayrollSerializer
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class PayrollViewSet(viewsets.ModelViewSet):
    serializer_class = PayrollSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Payroll.objects.select_related("employee__user")
        if user.role in ["ADMIN", "RH"]:
            return qs.all()
        return qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_update(self, serializer):
        old_status = serializer.instance.status
        payroll = serializer.save()

        if old_status != Payroll.Status.PAID and payroll.status == Payroll.Status.PAID:
            self._notify_employee_payslip_paid(payroll)

    def _notify_employee_payslip_paid(self, payroll: Payroll) -> None:
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
