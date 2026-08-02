"""Règles métier définissant qui peut ouvrir une conversation avec qui.

Le cloisonnement suit la matrice RBAC du cahier des charges :

    Initiateur → Destinataires autorisés
    ------------------------------------
    Admin      → Admin, RH, Employé, Candidat
    RH         → Admin, RH, Employé, Candidat
    Employé    → Admin, RH, Employé
    Candidat   → Admin, RH

Le candidat est un utilisateur externe : il ne doit jamais accéder à l'annuaire
des employés, mais il doit pouvoir dialoguer avec le service RH (suivi de
candidature) et répondre aux messages qu'on lui adresse.
"""

from __future__ import annotations

from django.db.models import QuerySet

from smart_hr.users.models import User

CONTACTABLE_ROLES: dict[str, frozenset[str]] = {
    User.Role.ADMIN: frozenset(
        {User.Role.ADMIN, User.Role.RH, User.Role.EMPLOYEE, User.Role.CANDIDATE},
    ),
    User.Role.RH: frozenset(
        {User.Role.ADMIN, User.Role.RH, User.Role.EMPLOYEE, User.Role.CANDIDATE},
    ),
    User.Role.EMPLOYEE: frozenset({User.Role.ADMIN, User.Role.RH, User.Role.EMPLOYEE}),
    User.Role.CANDIDATE: frozenset({User.Role.ADMIN, User.Role.RH}),
}


def get_contactable_roles(initiator: User) -> frozenset[str]:
    """Retourne les rôles que `initiator` a le droit de contacter."""
    return CONTACTABLE_ROLES.get(initiator.role, frozenset())


def can_start_conversation(initiator: User, recipient: User) -> bool:
    """Indique si `initiator` peut ouvrir une conversation avec `recipient`."""
    if not initiator.is_authenticated or initiator.pk == recipient.pk:
        return False
    if not recipient.is_active:
        return False
    return recipient.role in get_contactable_roles(initiator)


def allowed_contacts_queryset(initiator: User) -> QuerySet[User]:
    """Annuaire des interlocuteurs autorisés pour `initiator`.

    Exclut l'utilisateur lui-même et les comptes désactivés. Renvoie un
    queryset vide si le rôle n'ouvre aucun droit de contact.
    """
    contactable_roles = get_contactable_roles(initiator)
    if not contactable_roles:
        return User.objects.none()

    return (
        User.objects.filter(is_active=True, role__in=contactable_roles)
        .exclude(pk=initiator.pk)
        .order_by("first_name", "last_name", "email")
    )
