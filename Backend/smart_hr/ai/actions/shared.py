"""Fonctions partagées entre plusieurs agents actionnables du chatbot."""

from __future__ import annotations


def require_role(user, allowed_roles: tuple[str, ...], error_message: str) -> dict | None:
    """Garde-fou de permission avant l'exécution d'une action du chatbot.

    Retourne None si l'utilisateur est autorisé, ou le dict {success: False, error}
    à renvoyer tel quel sinon — point de vérification unique pour les agents dont
    la permission se résume à un rôle fixe (RH/Admin). Les agents avec un modèle
    de permission plus riche (ex. `_execute_leave_approval`, qui autorise aussi
    les managers de département via `conge.services._assert_can_approve_or_reject`)
    ne passent pas par ce garde-fou et gèrent leur propre logique."""
    user_role = getattr(user, "role", "").upper()
    if user_role not in allowed_roles:
        return {"success": False, "error": error_message}
    return None


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
