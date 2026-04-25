import logging

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.conge.models import LeaveRequest
from smart_hr.conge.serializers import LeaveRequestSerializer
from smart_hr.core.email_service import send_leave_request_notification_to_rh
from smart_hr.core.email_service import send_leave_status_email
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

LEAVE_TYPE_LABELS = {
    "vacation": "Congé annuel",
    "sick": "Congé maladie",
    "personal": "Congé personnel",
    "maternity": "Congé maternité",
    "other": "Autre",
}


class LeaveRequestViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            return LeaveRequest.objects.select_related("employee__user", "approved_by").all()
        return LeaveRequest.objects.select_related("employee__user").filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["approve", "reject"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        leave = serializer.save()
        self._notify_rh_new_leave_request(leave)

    def _notify_rh_new_leave_request(self, leave: LeaveRequest) -> None:
        """Notifie tous les RH/Admin qu'une nouvelle demande de congé a été soumise."""
        rh_emails = list(
            User.objects.filter(role__in=[User.Role.RH, User.Role.ADMIN])
            .exclude(email="")
            .values_list("email", flat=True)
        )
        if not rh_emails:
            return

        employee_user = leave.employee.user
        employee_name = employee_user.get_full_name() or employee_user.email

        try:
            send_leave_request_notification_to_rh(
                rh_emails=rh_emails,
                employee_name=employee_name,
                leave_type_label=LEAVE_TYPE_LABELS.get(leave.leave_type, leave.leave_type),
                start_date=leave.start_date.strftime("%d/%m/%Y"),
                end_date=leave.end_date.strftime("%d/%m/%Y"),
                days_count=leave.duration_days,
                reason=leave.reason or "",
            )
        except Exception:
            logger.exception("Échec notification RH pour nouvelle demande de congé")

    def _notify_employee_leave_status(self, leave: LeaveRequest) -> None:
        """Envoie un email de notification à l'employé après décision RH."""
        employee_user = leave.employee.user
        reviewer_name = ""
        if leave.approved_by:
            reviewer_name = leave.approved_by.get_full_name() or leave.approved_by.email

        try:
            send_leave_status_email(
                employee_email=employee_user.email,
                first_name=employee_user.first_name or employee_user.email,
                leave_type=leave.leave_type,
                start_date=leave.start_date.strftime("%d/%m/%Y"),
                end_date=leave.end_date.strftime("%d/%m/%Y"),
                status=leave.status,
                reviewer_name=reviewer_name,
            )
        except Exception:
            logger.exception(
                "Échec de l'envoi de la notification congé à %s", employee_user.email
            )

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save()
        self._notify_employee_leave_status(leave)
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        leave = self.get_object()
        leave.status = LeaveRequest.Status.REJECTED
        leave.approved_by = request.user
        leave.save()
        self._notify_employee_leave_status(leave)
        return Response({"status": "rejected"})
