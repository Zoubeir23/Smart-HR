"""Agent Onboarding — génération du programme d'intégration/départ via Gemini."""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def extract_onboarding_parameters(question: str) -> dict:
    """
    Génère un programme d'intégration (ou de départ) structuré depuis le message
    via le LLM actif : contrairement à l'extraction d'objectif (champs fixes),
    ici le LLM **génère le contenu** des étapes à partir du contexte du poste
    (comme la génération d'offre d'emploi existante), pas seulement des champs.

    Retourne :
        {
            "employee_name": str | None,
            "program_type": "onboarding|offboarding",
            "title": str | None,
            "steps": [{"title": str, "description": str}],
        }
    """
    prompt = (
        "Analyse ce message d'un responsable RH qui souhaite créer un programme "
        "d'intégration (onboarding) ou de départ (offboarding) structuré pour un employé.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        '  "employee_name": "prénom et nom complets de l\'employé mentionné, ou null",\n'
        '  "program_type": "onboarding" ou "offboarding" (onboarding par défaut si ambigu),\n'
        '  "title": "titre du programme, ou null si non déterminable",\n'
        '  "steps": [{"title": "étape courte", "description": "détail de l\'étape en 1 phrase"}]\n'
        "}\n\n"
        "- Si un poste/métier est mentionné, génère 5 à 8 étapes concrètes et pertinentes "
        "pour ce poste (matériel, accès systèmes, présentation équipe, formation, documents "
        "administratifs, point de suivi à 30/60/90 jours...)\n"
        "- Ne déduis jamais employee_name ou title s'ils ne sont pas identifiables dans le message"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Génération LLM du programme d'onboarding échouée : %s", exc)
        parsed = {"employee_name": None, "program_type": "onboarding", "title": None, "steps": []}

    if parsed.get("program_type") not in ("onboarding", "offboarding"):
        parsed["program_type"] = "onboarding"
    parsed.setdefault("steps", [])
    return parsed


def execute_onboarding_creation(user, params: dict) -> dict:
    """Crée un programme d'intégration/départ (et ses étapes) via le serializer
    DRF existant — même chemin que POST /api/v1/personnel/onboarding-programs/.
    Réservé RH/Admin (même règle que l'API REST)."""
    from smart_hr.ai.actions.shared import find_employee_by_full_name
    from smart_hr.ai.actions.shared import require_role
    from smart_hr.personnel.models import OnboardingStep
    from smart_hr.personnel.serializers import OnboardingProgramSerializer

    permission_error = require_role(
        user, ("RH", "ADMIN"), "Seuls les responsables RH peuvent créer un programme d'intégration."
    )
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
