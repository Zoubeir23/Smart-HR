"""Schémas d'outils (function-calling natif) des agents actionnables du chatbot.

Chaque schéma suit le standard JSON Schema — le même dict est réutilisable tel
quel par les 4 fournisseurs LLM (Gemini `parameters_json_schema`, OpenAI/Grok
`function.parameters`, Anthropic `input_schema`), qui adaptent uniquement
l'enveloppe autour de ce schéma neutre à leur SDK respectif.
"""

from __future__ import annotations

from smart_hr.ai.actions.intent_detection import ACTION_METADATA

TOOL_SCHEMAS: dict[str, dict] = {
    "leave_request": {
        "type": "object",
        "properties": {
            "leave_type": {
                "type": "string",
                "enum": ["vacation", "sick", "personal", "maternity", "other"],
                "description": "Type de congé demandé",
            },
            "start_date": {"type": "string", "description": "Date de début au format YYYY-MM-DD"},
            "end_date": {"type": "string", "description": "Date de fin au format YYYY-MM-DD"},
            "reason": {"type": "string", "description": "Raison de la demande, si mentionnée"},
        },
        "required": ["start_date", "end_date"],
    },
    "leave_approval": {
        "type": "object",
        "properties": {
            "employee_name": {"type": "string", "description": "Prénom et nom complets de l'employé concerné"},
            "decision": {"type": "string", "enum": ["approve", "reject"], "description": "Décision du responsable RH"},
        },
        "required": ["employee_name", "decision"],
    },
    "objective_creation": {
        "type": "object",
        "properties": {
            "level": {
                "type": "string",
                "enum": ["individual", "department", "company"],
                "description": "Niveau de l'objectif OKR",
            },
            "department_name": {"type": "string", "description": "Nom du département concerné, si level=department"},
            "title": {"type": "string", "description": "Titre de l'objectif"},
            "period": {"type": "string", "description": "Période concernée, ex: Q1 2026"},
            "key_results": {
                "type": "array",
                "description": "Résultats clés mesurables de l'objectif",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "unit": {"type": "string", "description": "Unité de mesure, ex: clients, %, jours"},
                        "target_value": {"type": "number"},
                    },
                    "required": ["title"],
                },
            },
        },
        "required": ["title", "period", "key_results"],
    },
    "onboarding_creation": {
        "type": "object",
        "properties": {
            "employee_name": {"type": "string", "description": "Prénom et nom complets de l'employé concerné"},
            "program_type": {
                "type": "string",
                "enum": ["onboarding", "offboarding"],
                "description": "Intégration (onboarding) ou départ (offboarding)",
            },
            "title": {"type": "string", "description": "Titre du programme"},
            "steps": {
                "type": "array",
                "description": "Étapes concrètes du programme (5 à 8 recommandées)",
                "items": {
                    "type": "object",
                    "properties": {
                        "title": {"type": "string"},
                        "description": {"type": "string"},
                    },
                    "required": ["title"],
                },
            },
        },
        "required": ["employee_name", "steps"],
    },
    "job_offer_creation": {
        "type": "object",
        "properties": {
            "title": {"type": "string", "description": "Intitulé du poste"},
            "department": {"type": "string", "description": "Département/service concerné, si mentionné"},
            "location": {"type": "string", "description": "Lieu de travail, si mentionné"},
            "job_type": {
                "type": "string",
                "enum": ["full_time", "part_time", "contract", "internship"],
                "description": "Type de contrat",
            },
            "description": {"type": "string", "description": "Description complète et engageante du poste"},
            "requirements": {"type": "string", "description": "Prérequis, un par ligne"},
            "salary_range": {"type": "string", "description": "Fourchette salariale, si mentionnée"},
        },
        "required": ["title", "description"],
    },
}


def build_available_tools(user_role: str) -> list[dict]:
    """Construit la liste de tools (function-calling) visibles pour ce rôle.

    Chaque tool : {"name", "description", "parameters"} — format neutre consommé
    par `BaseLLMProvider.detect_action`, indépendant du fournisseur actif."""
    role_upper = (user_role or "").upper()
    return [
        {"name": intent, "description": meta["label"], "parameters": TOOL_SCHEMAS[intent]}
        for intent, meta in ACTION_METADATA.items()
        if role_upper in meta["roles"]
    ]
