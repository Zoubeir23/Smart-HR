"""Agent Recrutement — génération et exécution de la création d'offre d'emploi via Gemini."""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def extract_job_offer_parameters(question: str) -> dict:
    """
    Génère une offre d'emploi structurée depuis le message via le LLM actif —
    même principe de génération de contenu que `extract_onboarding_parameters`,
    et même structure de sortie que POST /api/v1/recruitment/job-offers/generate/
    (pour ne pas dupliquer les règles de validation du serializer).

    Retourne :
        {
            "title": str | None,
            "department": str | None,
            "location": str,
            "job_type": "full_time|part_time|contract|internship",
            "description": str | None,
            "requirements": str,
            "salary_range": str,
        }
    """
    prompt = (
        "Analyse ce message d'un responsable RH qui souhaite créer une offre d'emploi.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        '  "title": "intitulé du poste, ou null si non déterminable",\n'
        '  "department": "nom du département/service concerné, ou null si non déterminable",\n'
        '  "location": "lieu de travail mentionné, ou chaîne vide",\n'
        '  "job_type": "full_time|part_time|contract|internship (full_time par défaut si ambigu)",\n'
        '  "description": "description complète et engageante du poste (plusieurs phrases), '
        'ou null si aucun contexte suffisant",\n'
        '  "requirements": "liste des prérequis, un par ligne (séparés par \\n), ou chaîne vide",\n'
        '  "salary_range": "fourchette salariale si mentionnée, sinon chaîne vide"\n'
        "}\n\n"
        "- Ne déduis jamais title ou description s'ils ne sont pas identifiables dans le message\n"
        "- Si un poste/contexte métier est mentionné, génère une description et des prérequis pertinents"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Génération LLM de l'offre d'emploi échouée : %s", exc)
        parsed = {
            "title": None,
            "department": None,
            "location": "",
            "job_type": "full_time",
            "description": None,
            "requirements": "",
            "salary_range": "",
        }

    valid_job_types = {"full_time", "part_time", "contract", "internship"}
    if parsed.get("job_type") not in valid_job_types:
        parsed["job_type"] = "full_time"
    parsed.setdefault("location", "")
    parsed.setdefault("requirements", "")
    parsed.setdefault("salary_range", "")
    return parsed


def execute_job_offer_creation(user, params: dict) -> dict:
    """Crée une offre d'emploi via le serializer DRF existant — même chemin de
    validation que POST /api/v1/recruitment/job-offers/. Réservé RH/Admin
    (même règle que `JobOfferViewSet.get_permissions` pour l'action 'create')."""
    from smart_hr.recruitment.serializers import JobOfferSerializer

    user_role = getattr(user, "role", "").upper()
    if user_role not in ("RH", "ADMIN"):
        return {
            "success": False,
            "error": "Seuls les responsables RH peuvent créer une offre d'emploi.",
        }

    title = params.get("title")
    department = params.get("department")
    description = params.get("description")
    if not title or not department or not description:
        return {"success": False, "error": "job_offer_info_missing"}

    payload = {
        "title": title,
        "department": department,
        "location": params.get("location") or "",
        "job_type": params.get("job_type", "full_time"),
        "description": description,
        "requirements": params.get("requirements") or "",
        "salary_range": params.get("salary_range") or "",
    }

    serializer = JobOfferSerializer(data=payload)
    if not serializer.is_valid():
        logger.warning("Offre d'emploi via chatbot invalide pour %s : %s", user.email, serializer.errors)
        return {"success": False, "error": "Impossible de créer cette offre avec les informations fournies."}

    job_offer = serializer.save(created_by=user)

    return {
        "success": True,
        "type": "job_offer_created",
        "label": "Offre d'emploi créée",
        "data": {
            "job_offer_id": job_offer.pk,
            "title": job_offer.title,
            "department": job_offer.department,
            "job_type_display": job_offer.get_job_type_display(),
            "status_display": job_offer.get_status_display(),
        },
    }
