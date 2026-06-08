import logging

from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.conge.models import LeaveRequest
from smart_hr.conge.serializers import LeaveRequestSerializer
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """Gestion des demandes de congés et du workflow d'approbation RH."""

    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        """Retourne toutes les demandes pour RH/Admin, sinon celles de l'employé connecté."""
        user = self.request.user
        if user.role in [User.Role.ADMIN, User.Role.RH]:
            return LeaveRequest.objects.select_related(
                "employee__user",
                "approved_by",
            ).all()
        return LeaveRequest.objects.select_related("employee__user").filter(
            employee__user=user,
        )

    def get_permissions(self):
        """Réserve l'approbation/rejet et les modifications aux profils RH/Admin."""
        if self.action in ["approve", "reject", "update", "partial_update"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Crée la demande après vérification d'absence de chevauchement, puis notifie le RH."""
        user = self.request.user
        start_date = serializer.validated_data.get("start_date")
        end_date = serializer.validated_data.get("end_date")

        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist as exc:
            raise ValidationError(
                "Aucun profil employé trouvé pour cet utilisateur. Contactez le service RH.",
            ) from exc

        if start_date and end_date:
            overlap_exists = LeaveRequest.objects.filter(
                employee=employee,
                status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
                start_date__lte=end_date,
                end_date__gte=start_date,
            ).exists()
            if overlap_exists:
                raise ValidationError(
                    "Une demande de congé active existe déjà pour cette période.",
                )

        serializer.save(employee=employee)

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approuve une demande de congé. La notification est gérée par le signal post_save."""
        leave = self.get_object()
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save()
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Rejette une demande de congé. La notification est gérée par le signal post_save."""
        leave = self.get_object()
        leave.status = LeaveRequest.Status.REJECTED
        leave.approved_by = request.user
        leave.save()
        return Response({"status": "rejected"})
