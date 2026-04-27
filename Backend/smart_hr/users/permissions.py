from rest_framework.permissions import BasePermission

from smart_hr.users.models import User


class IsAdmin(BasePermission):
    """Autorise uniquement les utilisateurs ayant le rôle Admin."""

    def has_permission(self, request, view):
        """Vérifie qu'un utilisateur connecté possède le rôle Admin."""
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsRH(BasePermission):
    """Autorise les profils RH et Admin."""

    def has_permission(self, request, view):
        """Valide l'accès si l'utilisateur est authentifié et RH/Admin."""
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN,
            User.Role.RH,
        ]


class IsEmployee(BasePermission):
    """Autorise les employés, RH et Admin."""

    def has_permission(self, request, view):
        """Contrôle les accès pour les utilisateurs internes de la plateforme."""
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN,
            User.Role.RH,
            User.Role.EMPLOYEE,
        ]


class IsCandidate(BasePermission):
    """Autorise uniquement les candidats externes."""

    def has_permission(self, request, view):
        """Vérifie qu'un utilisateur connecté possède le rôle Candidat."""
        return request.user.is_authenticated and request.user.role == User.Role.CANDIDATE


class IsSelfOrRH(BasePermission):
    """Employé voit son propre profil, RH/Admin voit tout."""

    def has_object_permission(self, request, view, obj):
        """Applique la règle de visibilité objet par objet."""
        if request.user.role in [User.Role.ADMIN, User.Role.RH]:
            return True
        return obj.user == request.user
