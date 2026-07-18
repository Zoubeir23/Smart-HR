"""Agent OKR/Objectifs — extraction de paramètres et exécution via Gemini."""

from __future__ import annotations

import json
import logging

logger = logging.getLogger(__name__)


def extract_objective_parameters(question: str, can_manage: bool) -> dict:
    """
    Extrait les paramètres d'un objectif OKR depuis le message via le LLM actif.

    `can_manage` (RH/Admin) autorise les niveaux department/company ; un simple
    employé est toujours ramené au niveau individual, quoi que le LLM retourne
    (garde-fou serveur, ne dépend jamais uniquement de l'extraction IA).

    Retourne :
        {
            "level": "individual|department|company",
            "department_name": str | None,
            "title": str | None,
            "period": str | None,
            "key_results": [{"title": str, "unit": str, "target_value": float}],
        }
    """
    allowed_levels = "individual, department ou company" if can_manage else "individual uniquement"

    prompt = (
        "Analyse ce message d'un utilisateur RH/employé qui souhaite créer un objectif OKR.\n"
        "Retourne UNIQUEMENT un JSON valide, sans markdown ni backticks.\n\n"
        f'Message : "{question}"\n\n'
        "JSON attendu :\n"
        "{\n"
        f'  "level": "{allowed_levels}",\n'
        '  "department_name": "nom du département mentionné, ou null",\n'
        '  "title": "titre de l\'objectif, ou null si non déterminable",\n'
        '  "period": "période mentionnée (ex: Q1 2026), ou null",\n'
        '  "key_results": [{"title": "résultat clé", "unit": "unité ou chaîne vide", "target_value": nombre}]\n'
        "}\n\n"
        "- key_results : liste vide si aucun résultat clé mesurable n'est mentionné\n"
        "- Ne déduis jamais de valeurs par défaut : si une information est absente, utilise null"
    )

    try:
        from smart_hr.ai.llm_providers import get_llm_provider
        from smart_hr.ai.llm_providers.base import strip_llm_code_fences

        provider = get_llm_provider()
        raw = strip_llm_code_fences(provider.extract_json(prompt))
        parsed = json.loads(raw)
    except Exception as exc:
        logger.warning("Extraction LLM des paramètres objectif échouée : %s", exc)
        parsed = {"level": "individual", "department_name": None, "title": None, "period": None, "key_results": []}

    if not can_manage or parsed.get("level") not in ("individual", "department", "company"):
        parsed["level"] = "individual"

    parsed.setdefault("key_results", [])
    return parsed


def execute_objective_creation(user, params: dict) -> dict:
    """Crée un objectif OKR (et ses résultats clés) via le serializer DRF existant —
    même chemin de validation que POST /api/v1/personnel/objectives/, pour ne
    jamais dupliquer les règles métier (niveau, permissions, champs requis)."""
    from smart_hr.personnel.models import Department
    from smart_hr.personnel.models import Employee
    from smart_hr.personnel.models import KeyResult
    from smart_hr.personnel.serializers import ObjectiveSerializer

    title = params.get("title")
    period = params.get("period")
    key_results_payload = [kr for kr in params.get("key_results") or [] if kr.get("title")]
    if not title or not period or not key_results_payload:
        return {"success": False, "error": "objective_info_missing"}

    level = params.get("level", "individual")
    payload: dict = {"level": level, "title": title, "period": period}

    if level == "individual":
        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            return {
                "success": False,
                "error": "Aucun profil employé trouvé pour votre compte. Contactez le service RH.",
            }
        payload["employee"] = employee.pk
    elif level == "department":
        department_name = params.get("department_name")
        department = Department.objects.filter(name__iexact=(department_name or "").strip()).first()
        if department is None:
            return {"success": False, "error": "department_not_found"}
        payload["department"] = department.pk

    serializer = ObjectiveSerializer(data=payload)
    if not serializer.is_valid():
        logger.warning("Objectif OKR via chatbot invalide pour %s : %s", user.email, serializer.errors)
        return {"success": False, "error": "Impossible de créer cet objectif avec les informations fournies."}

    objective = serializer.save(created_by=user)
    KeyResult.objects.bulk_create(
        [
            KeyResult(
                objective=objective,
                title=kr.get("title", ""),
                unit=kr.get("unit") or "",
                target_value=kr.get("target_value") or 0,
                order=index,
            )
            for index, kr in enumerate(key_results_payload)
        ]
    )

    return {
        "success": True,
        "type": "objective_created",
        "label": "Objectif OKR créé",
        "data": {
            "objective_id": objective.pk,
            "title": objective.title,
            "period": objective.period,
            "level_display": objective.get_level_display(),
            "key_results_count": len(key_results_payload),
        },
    }
