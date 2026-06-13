import logging

from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.conge.models import LeaveRequest
from smart_hr.conge.serializers import LeaveRequestSerializer
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRHOrDepartmentManager

logger = logging.getLogger(__name__)


class LeaveRequestViewSet(viewsets.ModelViewSet):
    """Gestion des demandes de congés et du workflow d'approbation RH."""

    serializer_class = LeaveRequestSerializer

    def get_queryset(self):
        """Retourne les demandes selon le rôle :
        - Admin/RH : toutes les demandes
        - Manager de département : demandes de son équipe
        - Employé : uniquement ses propres demandes
        """
        user = self.request.user
        if user.role in [User.Role.ADMIN, User.Role.RH]:
            return LeaveRequest.objects.select_related(
                "employee__user",
                "approved_by",
            ).all()

        try:
            employee_profile = user.employee_profile
        except Employee.DoesNotExist:
            return LeaveRequest.objects.none()

        if employee_profile.is_department_manager and employee_profile.department:
            return LeaveRequest.objects.select_related(
                "employee__user",
                "approved_by",
            ).filter(employee__department=employee_profile.department)

        return LeaveRequest.objects.select_related("employee__user").filter(
            employee__user=user,
        )

    def get_permissions(self):
        """Permissions par action :
        - approve/reject : RH, Admin, ou Manager du département concerné
        - update/partial_update/destroy : IsAuthenticated (contrôle objet dans perform_*)
        - autres : IsAuthenticated
        """
        if self.action in ["approve", "reject"]:
            return [IsRHOrDepartmentManager()]
        return [IsAuthenticated()]

    def _assert_employee_can_modify_pending(self, leave: LeaveRequest) -> None:
        """Lève PermissionDenied si l'employé tente de modifier une demande non-PENDING ou qui n'est pas la sienne."""
        user = self.request.user
        if user.role in [User.Role.ADMIN, User.Role.RH]:
            return
        if leave.employee.user != user:
            raise PermissionDenied("Vous ne pouvez modifier que vos propres demandes de congé.")
        if leave.status != LeaveRequest.Status.PENDING:
            raise PermissionDenied(
                "Seules les demandes en attente peuvent être modifiées ou annulées. "
                "Contactez le service RH pour annuler une demande déjà validée."
            )

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

    def perform_update(self, serializer):
        """L'employé ne peut modifier que ses propres demandes PENDING."""
        self._assert_employee_can_modify_pending(self.get_object())
        serializer.save()

    def perform_destroy(self, instance: LeaveRequest) -> None:
        """L'employé ne peut supprimer que ses propres demandes PENDING."""
        self._assert_employee_can_modify_pending(instance)
        instance.delete()

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approuve une demande de congé (RH, Admin ou Manager du département)."""
        leave = self.get_object()
        self.check_object_permissions(request, leave)
        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save()
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Rejette une demande de congé (RH, Admin ou Manager du département)."""
        leave = self.get_object()
        self.check_object_permissions(request, leave)
        leave.status = LeaveRequest.Status.REJECTED
        leave.approved_by = request.user
        leave.save()
        return Response({"status": "rejected"}, status=status.HTTP_200_OK)
