from rest_framework.permissions import BasePermission

from smart_hr.users.models import User


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.ADMIN


class IsRH(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN,
            User.Role.RH,
        ]


class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in [
            User.Role.ADMIN,
            User.Role.RH,
            User.Role.EMPLOYEE,
        ]


class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == User.Role.CANDIDATE


class IsSelfOrRH(BasePermission):
    """Employé voit son propre profil, RH/Admin voit tout."""

    def has_object_permission(self, request, view, obj):
        if request.user.role in [User.Role.ADMIN, User.Role.RH]:
            return True
        return obj.user == request.user
