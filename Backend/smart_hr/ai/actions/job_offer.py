"""Agent Recrutement — exécution de la création d'offre d'emploi.

L'extraction des paramètres (dont la génération du contenu de l'offre) est
déléguée au function-calling natif du LLM actif (voir `tool_schemas.py`)."""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def _default_department_for(user) -> str | None:
    """Déduit le département par défaut d'une offre d'emploi depuis le profil
    Employee du RH qui la demande, quand le LLM n'a pas pu l'extraire du message
    (la plupart des demandes ne précisent pas explicitement de département)."""
    from smart_hr.personnel.models import Employee

    employee = Employee.objects.select_related("department").filter(user=user).first()
    if employee is None or employee.department is None:
        return None
    return employee.department.name


def execute_job_offer_creation(user, params: dict) -> dict:
    """Crée une offre d'emploi via le serializer DRF existant — même chemin de
    validation que POST /api/v1/recruitment/job-offers/. Réservé RH/Admin
    (même règle que `JobOfferViewSet.get_permissions` pour l'action 'create')."""
    from smart_hr.ai.actions.shared import require_role
    from smart_hr.recruitment.serializers import JobOfferSerializer

    permission_error = require_role(user, ("RH", "ADMIN"), "Seuls les responsables RH peuvent créer une offre d'emploi.")
    if permission_error is not None:
        return permission_error

    title = params.get("title")
    department = params.get("department") or _default_department_for(user)
    description = params.get("description")
    if not title or not department or not description:
        return {"success": False, "error": "job_offer_info_missing"}

    valid_job_types = {"full_time", "part_time", "contract", "internship"}
    job_type = params.get("job_type")
    if job_type not in valid_job_types:
        job_type = "full_time"

    payload = {
        "title": title,
        "department": department,
        "location": params.get("location") or "",
        "job_type": job_type,
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
