"""Agent Congé — exécution de la demande de congé.

L'extraction des paramètres (dates, type, raison) est déléguée au
function-calling natif du LLM actif (voir `tool_schemas.py`) : ce module ne
contient plus que la logique métier d'exécution et ses validations serveur."""

from __future__ import annotations

import logging
from datetime import date

logger = logging.getLogger(__name__)

_VALID_LEAVE_TYPES = ("vacation", "sick", "personal", "maternity", "other")


def _parse_and_validate_leave_dates(
    start_date_str: str | None,
    end_date_str: str | None,
) -> tuple[date | None, date | None, str | None]:
    """Retourne (start, end, error) — error est None si les dates sont valides."""
    if not start_date_str or not end_date_str:
        return None, None, "dates_missing"
    try:
        start = date.fromisoformat(start_date_str)
        end = date.fromisoformat(end_date_str)
    except ValueError:
        return None, None, "Format de date invalide. Utilisez JJ/MM/AAAA."
    if end < start:
        return None, None, "La date de fin est antérieure à la date de début."
    if start < date.today():
        return None, None, "La date de début est dans le passé."
    return start, end, None


def execute_leave_request(user, params: dict) -> dict:
    """Crée une demande de congé via Django ORM."""
    from smart_hr.conge.models import LeaveRequest
    from smart_hr.personnel.models import Employee

    try:
        employee = Employee.objects.get(user=user)
    except Employee.DoesNotExist:
        return {
            "success": False,
            "error": "Aucun profil employé trouvé pour votre compte. Contactez le service RH.",
        }

    start, end, date_error = _parse_and_validate_leave_dates(
        params.get("start_date"),
        params.get("end_date"),
    )
    if date_error:
        return {"success": False, "error": date_error}

    overlap_exists = LeaveRequest.objects.filter(
        employee=employee,
        status__in=[LeaveRequest.Status.PENDING, LeaveRequest.Status.APPROVED],
        start_date__lte=end,
        end_date__gte=start,
    ).exists()
    if overlap_exists:
        return {
            "success": False,
            "error": "Une demande de congé active existe déjà pour cette période.",
        }

    leave_type = params.get("leave_type")
    if leave_type not in _VALID_LEAVE_TYPES:
        leave_type = LeaveRequest.LeaveType.VACATION

    try:
        leave = LeaveRequest.objects.create(
            employee=employee,
            leave_type=leave_type,
            start_date=start,
            end_date=end,
            reason=params.get("reason") or "Demande créée via l'assistant IA Smart-HR",
        )

        return {
            "success": True,
            "type": "leave_created",
            "label": "Demande de congé créée",
            "data": {
                "leave_id": leave.pk,
                "leave_type": leave.get_leave_type_display(),
                "start_date": leave.start_date.strftime("%d/%m/%Y"),
                "end_date": leave.end_date.strftime("%d/%m/%Y"),
                "duration_days": leave.duration_days,
                "status": leave.get_status_display(),
            },
        }

    except Exception:
        logger.exception("Erreur création congé via chatbot pour %s", user.email)
        return {"success": False, "error": "Erreur interne. Veuillez réessayer."}
