"""Génération de noms d'utilisateur uniques côté serveur."""

import re
import unicodedata

from smart_hr.users.models import User

MAXIMUM_USERNAME_LENGTH = 150
FALLBACK_USERNAME_BASE = "utilisateur"


def _slugify_username_base(raw_value: str) -> str:
    """Réduit une valeur libre à un identifiant ASCII sûr pour un username."""
    normalized_value = unicodedata.normalize("NFKD", raw_value)
    ascii_value = normalized_value.encode("ascii", "ignore").decode("ascii")
    sanitized_value = re.sub(r"[^\w.@+-]", "", ascii_value.lower()).strip("._-")
    return sanitized_value or FALLBACK_USERNAME_BASE


def generate_unique_username(email: str) -> str:
    """Dérive un username unique de la partie locale de l'email.

    Deux homonymes (ou deux adresses partageant la même partie locale) ne
    peuvent plus provoquer d'erreur d'unicité : un suffixe numérique est ajouté
    jusqu'à obtenir un identifiant libre.
    """
    local_part = email.partition("@")[0]
    username_base = _slugify_username_base(local_part)[:MAXIMUM_USERNAME_LENGTH]

    if not User.objects.filter(username=username_base).exists():
        return username_base

    suffix_number = 2
    while True:
        suffix = str(suffix_number)
        truncated_base = username_base[: MAXIMUM_USERNAME_LENGTH - len(suffix)]
        candidate_username = f"{truncated_base}{suffix}"
        if not User.objects.filter(username=candidate_username).exists():
            return candidate_username
        suffix_number += 1
