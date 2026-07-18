"""Agent Onboarding — exécution de la création du programme d'intégration/départ.

L'extraction des paramètres (dont la génération du contenu des étapes) est
déléguée au function-calling natif du LLM actif (voir `tool_schemas.py`)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def execute_onboarding_creation(user, params: dict) -> dict:
    """Crée un programme d'intégration/départ (et ses étapes) via le serializer
    DRF existant — même chemin que POST /api/v1/personnel/onboarding-programs/.
    Réservé RH/Admin (même règle que l'API REST)."""
    from smart_hr.ai.actions.shared import find_employee_by_full_name
    from smart_hr.ai.actions.shared import require_role
    from smart_hr.personnel.models import OnboardingStep
    from smart_hr.personnel.serializers import OnboardingProgramSerializer

    permission_error = require_role(user, ("RH", "ADMIN"), "Seuls les responsables RH peuvent créer un programme d'intégration.")
    if permission_error is not None:
        return permission_error

    employee = find_employee_by_full_name(params.get("employee_name") or "")
    if employee is None:
        return {"success": False, "error": "employee_not_found"}

    steps_payload = [step for step in params.get("steps") or [] if step.get("title")]
    if not steps_payload:
        return {"success": False, "error": "onboarding_info_missing"}

    program_type = params.get("program_type", "onboarding")
    title = params.get("title") or (
        f"Programme d'intégration — {employee.user.get_full_name()}"
        if program_type == "onboarding"
        else f"Programme de départ — {employee.user.get_full_name()}"
    )

    payload = {"employee": employee.pk, "program_type": program_type, "title": title}
    serializer = OnboardingProgramSerializer(data=payload)
    if not serializer.is_valid():
        logger.warning("Programme d'onboarding via chatbot invalide pour %s : %s", user.email, serializer.errors)
        return {"success": False, "error": "Impossible de créer ce programme avec les informations fournies."}

    program = serializer.save(created_by=user)
    OnboardingStep.objects.bulk_create(
        [
            OnboardingStep(
                program=program,
                title=step.get("title", ""),
                description=step.get("description") or "",
                order=index,
            )
            for index, step in enumerate(steps_payload)
        ]
    )

    return {
        "success": True,
        "type": "onboarding_created",
        "label": "Programme d'intégration créé",
        "data": {
            "program_id": program.pk,
            "title": program.title,
            "employee_name": employee.user.get_full_name(),
            "program_type_display": program.get_program_type_display(),
            "steps_count": len(steps_payload),
        },
    }
