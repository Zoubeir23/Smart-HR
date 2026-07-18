"""Agent Dashboard — exécution de la validation/refus de congé.

L'extraction des paramètres (employé, décision) est déléguée au function-calling
natif du LLM actif (voir `tool_schemas.py`)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def execute_leave_approval(user, params: dict) -> dict:
    """Valide ou refuse la demande de congé la plus récente d'un employé, via les
    fonctions de service partagées (`smart_hr.conge.services.approve_leave`/
    `reject_leave`) — le même chemin métier que l'API REST
    (`LeaveRequestViewSet.approve/reject`), sans dupliquer la logique de
    permission, de solde ou de notification, et sans dépendre d'utilitaires
    de test (`APIRequestFactory`) dans du code de production."""
    from rest_framework.exceptions import APIException

    from smart_hr.ai.actions.shared import find_employee_by_full_name
    from smart_hr.conge.models import LeaveRequest
    from smart_hr.conge.services import approve_leave
    from smart_hr.conge.services import reject_leave

    decision = params.get("decision")
    if decision not in ("approve", "reject"):
        return {"success": False, "error": "leave_decision_missing"}

    employee = find_employee_by_full_name(params.get("employee_name") or "")
    if employee is None:
        return {"success": False, "error": "employee_not_found"}

    leave = LeaveRequest.objects.filter(employee=employee, status=LeaveRequest.Status.PENDING).order_by("-created_at").first()
    if leave is None:
        return {"success": False, "error": "no_pending_leave"}

    try:
        if decision == "approve":
            approve_leave(leave, user)
        else:
            reject_leave(leave, user)
    except APIException as exc:
        detail = exc.detail[0] if isinstance(exc.detail, list) else exc.detail
        return {"success": False, "error": str(detail)}

    return {
        "success": True,
        "type": "leave_decision_applied",
        "label": "Décision de congé appliquée",
        "data": {
            "employee_name": employee.user.get_full_name(),
            "decision": decision,
            "leave_type": leave.get_leave_type_display(),
            "start_date": leave.start_date.strftime("%d/%m/%Y"),
            "end_date": leave.end_date.strftime("%d/%m/%Y"),
        },
    }
