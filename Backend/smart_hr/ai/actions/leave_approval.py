"""Agent Dashboard — validation/refus de congé via Gemini."""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def extract_leave_approval_parameters(question: str) -> dict:
    """
    Extrait de quel employé et de quelle décision (approve/reject) il s'agit
    pour une validation/refus de congé demandée via le chat.

    Retourne : {"employee_name": str | None, "decision": "approve|reject|None"}
    """
    prompt = (
        "Analyse ce message d'un responsable RH qui souhaite valider ou refuser "
        "une demande de congé d'un employé.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        '  "employee_name": "prénom et nom complets de l\'employé mentionné, ou null",\n'
        '  "decision": "approve" si le RH valide/approuve, "reject" si le RH refuse/rejette, sinon null\n'
        "}\n"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Extraction LLM de la décision de congé échouée : %s", exc)
        parsed = {"employee_name": None, "decision": None}

    if parsed.get("decision") not in ("approve", "reject"):
        parsed["decision"] = None
    return parsed


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
