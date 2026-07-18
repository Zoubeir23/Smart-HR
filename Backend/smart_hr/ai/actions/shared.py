"""Fonctions partagées entre plusieurs agents actionnables du chatbot."""

from __future__ import annotations


def find_employee_by_full_name(full_name: str):
    """Résout un employé par correspondance exacte (insensible à la casse) sur
    prénom+nom. Retourne None si aucune correspondance ou plusieurs candidats
    ambigus — mieux vaut demander une précision que de cibler le mauvais employé."""
    from smart_hr.personnel.models import Employee

    target = (full_name or "").strip().lower()
    if not target:
        return None

    candidates = Employee.objects.select_related("user")
    matches = [e for e in candidates if f"{e.user.first_name} {e.user.last_name}".strip().lower() == target]
    return matches[0] if len(matches) == 1 else None
