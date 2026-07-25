"""Neutralisation des tentatives de prompt injection dans le contenu utilisateur.

Tout texte contrôlé par un utilisateur et destiné à un prompt LLM doit passer
par ce module. C'est particulièrement critique pour le chatbot RH, dont la
session dispose d'outils privilégiés (validation de congé, création d'offre) :
un texte injecté par un tiers dans le contexte pourrait tenter de détourner
l'appel de ces outils.
"""

from __future__ import annotations

import re

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
    lines = [
        "[ligne supprimée]" if _starts_with_injection_pattern(line) else line for line in text.splitlines()
    ]
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
