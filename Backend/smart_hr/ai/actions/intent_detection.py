"""Métadonnées des intents actionnables et détection d'intention par mots-clés."""

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


_LEAVE_INTENT_KEYWORDS = (
    "congé",
    "conge",
    "vacances",
    "absent",
    "absence",
    "malade",
    "maladie",
    "arrêt maladie",
    "repos",
    "arret",
    "poser un congé",
    "demande de congé",
    "je veux prendre",
    "jour de repos",
    "partir en vacances",
    "jours de vacances",
    "congé maternité",
    "congé personnel",
    "congé annuel",
)


_LEAVE_APPROVAL_KEYWORDS = (
    "valider le congé",
    "valide le congé",
    "valider la demande de congé",
    "valide la demande de congé",
    "approuver le congé",
    "approuve le congé",
    "approuver la demande de congé",
    "approuve la demande de congé",
    "refuser le congé",
    "refuse le congé",
    "refuser la demande de congé",
    "refuse la demande de congé",
    "rejeter le congé",
    "rejette le congé",
    "rejeter la demande de congé",
    "rejette la demande de congé",
)


_OBJECTIVE_INTENT_KEYWORDS = (
    "objectif",
    "okr",
    "résultat clé",
    "resultat cle",
    "key result",
    "objectif stratégique",
    "objectif d'entreprise",
    "objectif de département",
)

_ONBOARDING_INTENT_KEYWORDS = (
    "onboarding",
    "programme d'intégration",
    "parcours d'intégration",
    "intégration du nouvel employé",
    "intégration de la nouvelle",
    "intégrer un nouvel employé",
    "intégrer une nouvelle recrue",
    "programme d'accueil",
    "parcours d'accueil",
    "offboarding",
    "programme de départ",
    "nouvel employé",
    "nouvelle recrue",
)

_JOB_OFFER_INTENT_KEYWORDS = (
    "offre d'emploi",
    "offre d emploi",
    "crée une offre",
    "creer une offre",
    "créer une offre",
    "publier une offre",
    "publie une offre",
    "poste à pourvoir",
    "poste a pourvoir",
    "ouvrir un poste",
    "ouvre un poste",
    "recruter pour",
    "annonce de recrutement",
    "fiche de poste",
)


def detect_action_intent(question: str) -> str | None:
    """
    Détecte l'intention d'action dans la question de l'utilisateur.
    Retourne le nom de l'action si détectée, None sinon.

    Actions supportées : 'leave_request', 'leave_approval', 'objective_creation',
    'onboarding_creation', 'job_offer_creation'

    `leave_approval` (RH valide/refuse la demande d'un tiers) est vérifié avant
    `leave_request` (un employé pose son propre congé) car les deux formulations
    contiennent toutes deux le mot "congé" — la plus spécifique doit gagner.
    """
    lower = question.lower()
    if any(kw in lower for kw in _LEAVE_APPROVAL_KEYWORDS):
        return "leave_approval"
    if any(kw in lower for kw in _LEAVE_INTENT_KEYWORDS):
        return "leave_request"
    if any(kw in lower for kw in _OBJECTIVE_INTENT_KEYWORDS):
        return "objective_creation"
    if any(kw in lower for kw in _ONBOARDING_INTENT_KEYWORDS):
        return "onboarding_creation"
    if any(kw in lower for kw in _JOB_OFFER_INTENT_KEYWORDS):
        return "job_offer_creation"
    return None
