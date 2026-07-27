"""Neutralisation des tentatives de prompt injection dans le contenu utilisateur.

Tout texte contrôlé par un utilisateur et destiné à un prompt LLM doit passer
par ce module. C'est particulièrement critique pour le chatbot RH, dont la
session dispose d'outils privilégiés (validation de congé, création d'offre) :
un texte injecté par un tiers dans le contexte pourrait tenter de détourner
l'appel de ces outils.
"""

from __future__ import annotations

import re

# ─── Transcriptions de conversation (entretiens IA) ──────────────────────────
#
# Un candidat contrôle intégralement le contenu de sa réponse vocale, retranscrite
# telle quelle par le fournisseur de transcription puis renvoyée par le frontend.
# Cette transcription atteint ensuite un prompt LLM d'évaluation : elle doit donc
# être bornée en taille et neutralisée contre l'injection, exactement comme tout
# autre texte utilisateur destiné à un prompt.
MAX_CONVERSATION_MESSAGES = 50
MAX_CONVERSATION_MESSAGE_CHARS = 2000

_CONVERSATION_INJECTION_PATTERN = re.compile(
    r"(system\s*:|assistant\s*:|ignore\s+(previous|all)\s+instructions?|<\s*/?system\s*>)",
    re.IGNORECASE,
)


def sanitize_conversation_message(content: str) -> str:
    """Neutralise les tentatives de prompt injection dans un message de transcription."""
    sanitized = _CONVERSATION_INJECTION_PATTERN.sub("[filtre]", content)
    return sanitized[:MAX_CONVERSATION_MESSAGE_CHARS]


def validate_conversation(conversation: object) -> tuple[bool, str]:
    """Valide la forme d'une conversation avant sanitisation. Retourne (is_valid, error_message)."""
    if not isinstance(conversation, list):
        return False, "Le champ 'conversation' doit être une liste."
    if len(conversation) > MAX_CONVERSATION_MESSAGES:
        return False, f"La conversation ne peut pas dépasser {MAX_CONVERSATION_MESSAGES} messages."
    for message in conversation:
        if not isinstance(message, dict):
            return False, "Chaque message doit être un objet JSON."
        content = message.get("content", "")
        if not isinstance(content, str):
            return False, "Le champ 'content' de chaque message doit être une chaîne."
        if len(content) > MAX_CONVERSATION_MESSAGE_CHARS:
            return False, f"Un message dépasse la longueur maximale de {MAX_CONVERSATION_MESSAGE_CHARS} caractères."
    return True, ""


INJECTION_PATTERN_PREFIXES = (
    "ignore ",
    "forget ",
    "disregard ",
    "override ",
    "system:",
    "assistant:",
    "user:",
    "[system]",
    "[inst]",
    "</s>",
    "<|",
)

_WHITESPACE_RUN = re.compile(r"\s+")


def _starts_with_injection_pattern(line: str) -> bool:
    stripped = line.strip().lower()
    return any(stripped.startswith(prefix) for prefix in INJECTION_PATTERN_PREFIXES)


def sanitize_free_text(text: str, max_length: int = 3000) -> str:
    """Assainit un texte long et multi-lignes (CV, lettre de motivation, fiche de poste).

    Stratégie : suppression des lignes qui commencent par des patterns d'injection
    connus, puis troncature. Le contenu est ensuite encadré par des balises
    explicites dans les prompts.
    """
    if not text:
        return ""
    lines = ["[ligne supprimée]" if _starts_with_injection_pattern(line) else line for line in text.splitlines()]
    return "\n".join(lines)[:max_length]


def sanitize_identity_label(text: str, max_length: int = 80) -> str:
    """Assainit un libellé court inséré dans une ligne de contexte (nom, titre).

    Un nom ou un titre légitime tient sur une seule ligne. On écrase donc tout
    retour à la ligne et toute suite d'espaces : cela retire le principal levier
    d'évasion, qui consiste à forger de fausses lignes de prompt depuis un champ
    court. La troncature borne ensuite la charge utile, et le filtre de préfixes
    couvre les tentatives tenant sur une seule ligne.
    """
    if not text:
        return ""
    collapsed = _WHITESPACE_RUN.sub(" ", text).strip()
    if not collapsed:
        return ""
    if _starts_with_injection_pattern(collapsed):
        return "[libellé supprimé]"
    return collapsed[:max_length]
