import logging

from django.db import transaction
from django.utils.timezone import now
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.conge.models import DEDUCTIBLE_LEAVE_TYPES
from smart_hr.conge.models import LeaveRequest
from smart_hr.conge.serializers import LeaveRequestSerializer
from smart_hr.core.models import Notification
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

        Filtre optionnel par query param ``status`` (pending/approved/rejected).
        """
        user = self.request.user
        base = LeaveRequest.objects.select_related("employee__user", "approved_by")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            queryset = base
        else:
            try:
                employee_profile = user.employee_profile
            except Employee.DoesNotExist:
                return LeaveRequest.objects.none()

            if employee_profile.is_department_manager and employee_profile.department:
                queryset = base.filter(employee__department=employee_profile.department)
            else:
                queryset = base.filter(employee__user=user)

        status_filter = self.request.query_params.get("status")
        if status_filter:
            valid_statuses = {choice[0] for choice in LeaveRequest.Status.choices}
            if status_filter in valid_statuses:
                queryset = queryset.filter(status=status_filter)

        return queryset

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

    @action(detail=False, methods=["get"])
    def balance(self, request):
        """Solde de congés de l'employé connecté (ou ?employee_id=X pour RH/Admin).

        Query params :
        - year (int) : année souhaitée (défaut = année courante)
        - employee_id (int) : uniquement pour Admin/RH
        """
        try:
            year = int(request.query_params.get("year", now().year))
        except ValueError:
            return Response(
                {"detail": "Le paramètre year doit être un entier."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        employee_id = request.query_params.get("employee_id")

        if request.user.role in [User.Role.ADMIN, User.Role.RH] and employee_id:
            try:
                employee = Employee.objects.get(id=employee_id)
            except Employee.DoesNotExist:
                return Response({"detail": "Employé introuvable."}, status=status.HTTP_404_NOT_FOUND)
        else:
            try:
                employee = Employee.objects.get(user=request.user)
            except Employee.DoesNotExist:
                return Response({"detail": "Aucun profil employé."}, status=status.HTTP_404_NOT_FOUND)

        base = LeaveRequest.objects.filter(employee=employee, leave_type__in=DEDUCTIBLE_LEAVE_TYPES)

        approved_leaves = base.filter(status=LeaveRequest.Status.APPROVED, start_date__year=year)
        pending_leaves = base.filter(status=LeaveRequest.Status.PENDING, start_date__year=year)

        days_taken = sum(leave.duration_working_days for leave in approved_leaves)
        days_pending = sum(leave.duration_working_days for leave in pending_leaves)

        annual_allowance = 30  # allocation standard — à personnaliser si besoin
        days_remaining = max(0, annual_allowance - days_taken)

        return Response(
            {
                "year": year,
                "annual_allowance": annual_allowance,
                "days_taken": days_taken,
                "days_pending": days_pending,
                "days_remaining": days_remaining,
            },
        )

    @staticmethod
    def _working_days_in_year(leave, year: int) -> int:
        """Compte les jours ouvrés du congé qui tombent dans l'année donnée."""
        from datetime import date
        from datetime import timedelta

        start = max(leave.start_date, date(year, 1, 1))
        end = min(leave.end_date, date(year, 12, 31))
        if start > end:
            return 0
        count = 0
        current = start
        while current <= end:
            if current.weekday() < 5:
                count += 1
            current += timedelta(days=1)
        return count

    def _check_leave_balance_by_year(self, leave):
        """Vérifie le solde pour chaque année calendaire couverte par le congé.

        Retourne (year, days_remaining, days_requested) si insuffisant, sinon None.
        """
        annual_allowance = 30
        years = {leave.start_date.year, leave.end_date.year}
        for year in sorted(years):
            days_in_year = self._working_days_in_year(leave, year)
            if days_in_year == 0:
                continue
            approved_leaves = LeaveRequest.objects.filter(
                employee=leave.employee,
                status=LeaveRequest.Status.APPROVED,
                leave_type__in=DEDUCTIBLE_LEAVE_TYPES,
                start_date__year=year,
            )
            days_taken = sum(l.duration_working_days for l in approved_leaves)
            days_remaining = annual_allowance - days_taken
            if days_in_year > days_remaining:
                return (year, days_remaining, days_in_year)
        return None

    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        """Approuve une demande de congé (RH, Admin ou Manager du département)."""
        leave = self.get_object()
        self.check_object_permissions(request, leave)

        if leave.status != LeaveRequest.Status.PENDING:
            return Response(
                {"detail": "Seules les demandes en attente peuvent être approuvées."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if leave.is_deductible:
            insufficient_year = self._check_leave_balance_by_year(leave)
            if insufficient_year is not None:
                year, days_remaining, days_requested = insufficient_year
                return Response(
                    {
                        "detail": (
                            f"Solde insuffisant pour {year} : {days_remaining}j disponibles, "
                            f"{days_requested}j demandés sur cette année."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )

        leave.status = LeaveRequest.Status.APPROVED
        leave.approved_by = request.user
        leave.save()

        Notification.objects.create(
            recipient=leave.employee.user,
            notification_type=Notification.NotificationType.LEAVE_APPROVED,
            title="Congé approuvé",
            message=(
                f"Votre demande de {leave.get_leave_type_display()} du {leave.start_date} au {leave.end_date} a été approuvée."
            ),
            target_url=f"/conges/{leave.pk}/",
        )
        return Response({"status": "approved"})

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        """Rejette une demande de congé (RH, Admin ou Manager du département)."""
        leave = self.get_object()
        self.check_object_permissions(request, leave)

        if leave.status != LeaveRequest.Status.PENDING:
            return Response(
                {"detail": "Seules les demandes en attente peuvent être refusées."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leave.status = LeaveRequest.Status.REJECTED
        leave.save()

        Notification.objects.create(
            recipient=leave.employee.user,
            notification_type=Notification.NotificationType.LEAVE_REJECTED,
            title="Congé refusé",
            message=(
                f"Votre demande de {leave.get_leave_type_display()} du {leave.start_date} au {leave.end_date} a été refusée."
            ),
            target_url=f"/conges/{leave.pk}/",
        )
        return Response({"status": "rejected"}, status=status.HTTP_200_OK)

    @action(detail=False, methods=["post"], url_path="bulk-approve", permission_classes=[IsRHOrDepartmentManager])
    def bulk_approve(self, request):
        """Approuve en masse une liste de demandes de congé.

        Corps : {"ids": [1, 2, 3]}
        Retourne le décompte : approved, skipped (déjà traitées), rejected (solde insuffisant).
        """
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "Fournir une liste d'identifiants non vide dans 'ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leaves = LeaveRequest.objects.filter(pk__in=ids).select_related("employee__user", "employee")
        approved_ids: list[int] = []
        skipped_ids: list[int] = []
        insufficient_ids: list[dict] = []

        with transaction.atomic():
            for leave in leaves:
                if leave.status != LeaveRequest.Status.PENDING:
                    skipped_ids.append(leave.pk)
                    continue

                if leave.is_deductible:
                    insufficient_year = self._check_leave_balance_by_year(leave)
                    if insufficient_year is not None:
                        year, days_remaining, days_requested = insufficient_year
                        insufficient_ids.append(
                            {
                                "id": leave.pk,
                                "detail": (
                                    f"Solde insuffisant pour {year} : {days_remaining}j disponibles, {days_requested}j demandés."
                                ),
                            }
                        )
                        continue

                leave.status = LeaveRequest.Status.APPROVED
                leave.approved_by = request.user
                leave.save(update_fields=["status", "approved_by"])

                Notification.objects.create(
                    recipient=leave.employee.user,
                    notification_type=Notification.NotificationType.LEAVE_APPROVED,
                    title="Congé approuvé",
                    message=(
                        f"Votre demande de {leave.get_leave_type_display()} du "
                        f"{leave.start_date} au {leave.end_date} a été approuvée."
                    ),
                    target_url=f"/conges/{leave.pk}/",
                )
                approved_ids.append(leave.pk)

        return Response(
            {
                "approved": len(approved_ids),
                "approved_ids": approved_ids,
                "skipped_not_pending": len(skipped_ids),
                "skipped_ids": skipped_ids,
                "rejected_insufficient_balance": len(insufficient_ids),
                "rejected_details": insufficient_ids,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=False, methods=["post"], url_path="bulk-reject", permission_classes=[IsRHOrDepartmentManager])
    def bulk_reject(self, request):
        """Rejette en masse une liste de demandes de congé.

        Corps : {"ids": [1, 2, 3]}
        Retourne le décompte : rejected, skipped (déjà traitées).
        """
        ids = request.data.get("ids")
        if not isinstance(ids, list) or not ids:
            return Response(
                {"detail": "Fournir une liste d'identifiants non vide dans 'ids'."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        leaves = LeaveRequest.objects.filter(pk__in=ids).select_related("employee__user")
        rejected_ids: list[int] = []
        skipped_ids: list[int] = []

        with transaction.atomic():
            for leave in leaves:
                if leave.status != LeaveRequest.Status.PENDING:
                    skipped_ids.append(leave.pk)
                    continue

                leave.status = LeaveRequest.Status.REJECTED
                leave.save(update_fields=["status"])

                Notification.objects.create(
                    recipient=leave.employee.user,
                    notification_type=Notification.NotificationType.LEAVE_REJECTED,
                    title="Congé refusé",
                    message=(
                        f"Votre demande de {leave.get_leave_type_display()} du "
                        f"{leave.start_date} au {leave.end_date} a été refusée."
                    ),
                    target_url=f"/conges/{leave.pk}/",
                )
                rejected_ids.append(leave.pk)

        return Response(
            {
                "rejected": len(rejected_ids),
                "rejected_ids": rejected_ids,
                "skipped_not_pending": len(skipped_ids),
                "skipped_ids": skipped_ids,
            },
            status=status.HTTP_200_OK,
        )
