"""Métadonnées des intents actionnables du chatbot (utilisées côté frontend
et pour dériver la liste de tools du function-calling natif).

La détection d'intention elle-même n'est plus basée sur des mots-clés : elle
est déléguée au function-calling natif du LLM actif (voir `tool_schemas.py`
et `BaseLLMProvider.detect_action`), qui choisit l'action et en extrait les
paramètres en un seul appel structuré plutôt qu'un pré-filtrage par regex."""

from __future__ import annotations

ACTION_METADATA: dict[str, dict] = {
    "leave_request": {
        "label": "Poser un congé",
        "roles": ("EMPLOYEE", "RH", "ADMIN"),
        "example": "Pose un congé du 12 au 15 août",
    },
    "leave_approval": {
        "label": "Valider ou refuser un congé",
        "roles": ("RH", "ADMIN"),
        "example": "Valide le congé de Awa Diallo",
    },
    "objective_creation": {
        "label": "Créer un objectif OKR",
        "roles": ("EMPLOYEE", "RH", "ADMIN"),
        "example": "Crée un objectif de 10 clients signés pour Q1 2026",
    },
    "onboarding_creation": {
        "label": "Créer un programme d'intégration",
        "roles": ("RH", "ADMIN"),
        "example": "Crée un onboarding pour Awa Diallo, développeuse backend",
    },
    "job_offer_creation": {
        "label": "Créer une offre d'emploi",
        "roles": ("RH", "ADMIN"),
        "example": "Crée une offre d'emploi pour un développeur Django à Dakar",
    },
}


def list_supported_actions_for_role(role: str) -> list[dict]:
    """Retourne les intents actionnables du chat visibles pour ce rôle
    (utilisé par GET /api/v1/ai/actions/ pour construire une aide contextuelle
    côté frontend plutôt qu'une liste figée en dur)."""
    role_upper = (role or "").upper()
    return [
        {"intent": intent, "label": meta["label"], "example": meta["example"]}
        for intent, meta in ACTION_METADATA.items()
        if role_upper in meta["roles"]
    ]
