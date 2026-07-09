"""
Logique métier de validation/refus des demandes de congé, partagée entre
`LeaveRequestViewSet` (API REST) et l'agent conversationnel Dashboard
(`smart_hr.ai.actions`) — un seul chemin de vérité pour les règles de
permission, de solde et de notification.
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date
from datetime import timedelta
from types import SimpleNamespace

from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError

from smart_hr.conge.models import DEDUCTIBLE_LEAVE_TYPES
from smart_hr.conge.models import LeaveRequest
from smart_hr.core.models import Notification
from smart_hr.users.permissions import IsRHOrDepartmentManager

ANNUAL_LEAVE_ALLOWANCE = 30


def _working_days_in_year(leave: LeaveRequest, year: int) -> int:
    """Compte les jours ouvrés du congé qui tombent dans l'année donnée."""
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


def check_leave_balance_by_year(leave: LeaveRequest) -> tuple[int, int, int] | None:
    """Vérifie le solde pour chaque année calendaire couverte par le congé.

    Charge toutes les années concernées en une seule requête DB au lieu
    d'une requête par année, puis calcule les jours pris en mémoire.
    Retourne (year, days_remaining, days_requested) si insuffisant, sinon None.
    """
    years = sorted({leave.start_date.year, leave.end_date.year})

    all_approved = LeaveRequest.objects.filter(
        employee=leave.employee,
        status=LeaveRequest.Status.APPROVED,
        leave_type__in=DEDUCTIBLE_LEAVE_TYPES,
        start_date__year__in=years,
    )

    days_taken_by_year: dict[int, int] = defaultdict(int)
    for past_leave in all_approved:
        days_taken_by_year[past_leave.start_date.year] += past_leave.duration_working_days

    for year in years:
        days_in_year = _working_days_in_year(leave, year)
        if days_in_year == 0:
            continue
        days_remaining = ANNUAL_LEAVE_ALLOWANCE - days_taken_by_year[year]
        if days_in_year > days_remaining:
            return (year, days_remaining, days_in_year)
    return None


def _assert_can_approve_or_reject(acting_user, leave: LeaveRequest) -> None:
    """Réutilise `IsRHOrDepartmentManager` (permission REST) pour vérifier que
    `acting_user` peut valider/refuser `leave` — même règle que l'API REST,
    sans dépendre d'un objet `request` complet ni d'utilitaires de test."""
    permission = IsRHOrDepartmentManager()
    fake_request = SimpleNamespace(user=acting_user)
    if not permission.has_permission(fake_request, None) or not permission.has_object_permission(fake_request, None, leave):
        raise PermissionDenied("Vous n'avez pas la permission d'effectuer cette action.")


def approve_leave(leave: LeaveRequest, acting_user) -> LeaveRequest:
    """Approuve une demande de congé (RH, Admin ou Manager du département)."""
    _assert_can_approve_or_reject(acting_user, leave)

    if leave.status != LeaveRequest.Status.PENDING:
        raise ValidationError("Seules les demandes en attente peuvent être approuvées.")

    if leave.is_deductible:
        insufficient_year = check_leave_balance_by_year(leave)
        if insufficient_year is not None:
            year, days_remaining, days_requested = insufficient_year
            raise ValidationError(
                f"Solde insuffisant pour {year} : {days_remaining}j disponibles, {days_requested}j demandés sur cette année."
            )

    leave.status = LeaveRequest.Status.APPROVED
    leave.approved_by = acting_user
    leave.save()

    Notification.objects.create(
        recipient=leave.employee.user,
        notification_type=Notification.NotificationType.LEAVE_APPROVED,
        title="Congé approuvé",
        message=(f"Votre demande de {leave.get_leave_type_display()} du {leave.start_date} au {leave.end_date} a été approuvée."),
        target_url=f"/conges/{leave.pk}/",
    )
    return leave


def reject_leave(leave: LeaveRequest, acting_user) -> LeaveRequest:
    """Rejette une demande de congé (RH, Admin ou Manager du département)."""
    _assert_can_approve_or_reject(acting_user, leave)

    if leave.status != LeaveRequest.Status.PENDING:
        raise ValidationError("Seules les demandes en attente peuvent être refusées.")

    leave.status = LeaveRequest.Status.REJECTED
    leave.save()

    Notification.objects.create(
        recipient=leave.employee.user,
        notification_type=Notification.NotificationType.LEAVE_REJECTED,
        title="Congé refusé",
        message=(f"Votre demande de {leave.get_leave_type_display()} du {leave.start_date} au {leave.end_date} a été refusée."),
        target_url=f"/conges/{leave.pk}/",
    )
    return leave
