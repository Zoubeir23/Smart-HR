"""Agent OKR/Objectifs — exécution de la création d'objectif.

L'extraction des paramètres est déléguée au function-calling natif du LLM actif
(voir `tool_schemas.py`) : le schéma `objective_creation` ne restreint pas le
champ "level" par rôle (le tool-calling n'a pas connaissance des permissions),
donc le clamp RH/Admin ci-dessous reste indispensable côté serveur — un simple
employé ne doit jamais pouvoir créer un objectif de département/entreprise,
quoi que le LLM ait extrait."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


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

    user_role = getattr(user, "role", "").upper()
    can_manage = user_role in ("RH", "ADMIN")
    level = params.get("level", "individual")
    if not can_manage or level not in ("individual", "department", "company"):
        level = "individual"

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
