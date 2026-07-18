"""
Moteur d'actions métier du chatbot Smart-HR.

Flux :
  1. detect_action_intent()      — détecte si le message contient une intention d'action
  2. extract_leave_parameters()  — extrait les paramètres via le LLM actif (dates, type, etc.)
  3. execute_action()            — exécute l'action Django (crée le congé, etc.)
  4. Retourne un dict structuré {success, type, label, data} pour la réponse API

Chaque agent (congé, validation de congé, OKR, onboarding, offre d'emploi) vit dans
son propre module ; ce fichier ne fait que ré-exporter l'API publique et dispatcher
`execute_action` vers l'exécuteur du bon agent.
"""

from __future__ import annotations

from smart_hr.ai.actions.intent_detection import ACTION_METADATA
from smart_hr.ai.actions.intent_detection import detect_action_intent
from smart_hr.ai.actions.intent_detection import list_supported_actions_for_role
from smart_hr.ai.actions.job_offer import execute_job_offer_creation
from smart_hr.ai.actions.job_offer import extract_job_offer_parameters
from smart_hr.ai.actions.leave import execute_leave_request
from smart_hr.ai.actions.leave import extract_leave_parameters
from smart_hr.ai.actions.leave_approval import execute_leave_approval
from smart_hr.ai.actions.leave_approval import extract_leave_approval_parameters
from smart_hr.ai.actions.objective import execute_objective_creation
from smart_hr.ai.actions.objective import extract_objective_parameters
from smart_hr.ai.actions.onboarding import execute_onboarding_creation
from smart_hr.ai.actions.onboarding import extract_onboarding_parameters

__all__ = [
    "ACTION_METADATA",
    "detect_action_intent",
    "execute_action",
    "execute_job_offer_creation",
    "execute_leave_approval",
    "execute_leave_request",
    "execute_objective_creation",
    "execute_onboarding_creation",
    "extract_job_offer_parameters",
    "extract_leave_approval_parameters",
    "extract_leave_parameters",
    "extract_objective_parameters",
    "extract_onboarding_parameters",
    "list_supported_actions_for_role",
]


def execute_action(action_intent: str, user, params: dict) -> dict:
    """
    Dispatche et exécute l'action détectée.
    Retourne un dict {success, type, label, data} ou {success, error}.
    """
    if action_intent == "leave_request":
        return execute_leave_request(user, params)
    if action_intent == "leave_approval":
        return execute_leave_approval(user, params)
    if action_intent == "objective_creation":
        return execute_objective_creation(user, params)
    if action_intent == "onboarding_creation":
        return execute_onboarding_creation(user, params)
    if action_intent == "job_offer_creation":
        return execute_job_offer_creation(user, params)
    return {"success": False, "error": f"Action '{action_intent}' non supportée."}
