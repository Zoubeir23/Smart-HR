from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'ADMIN'


class IsRH(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ADMIN', 'RH')


class IsEmployee(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('ADMIN', 'RH', 'EMPLOYEE')


class IsCandidate(BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'CANDIDATE'


class IsOwnerOrRH(BasePermission):
    """Allow access if user is the owner of the object or is RH/Admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role in ('ADMIN', 'RH'):
            return True
        # Check common FK patterns
        if hasattr(obj, 'user'):
            return obj.user == request.user
        if hasattr(obj, 'employee') and hasattr(obj.employee, 'user'):
            return obj.employee.user == request.user
        return False
