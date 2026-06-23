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


class IsRHOrDepartmentManager(BasePermission):
    """Autorise les RH/Admin ou les employés désignés managers d'un département."""

    def has_permission(self, request, view) -> bool:
        """Vérifie que l'utilisateur est authentifié et RH/Admin ou manager."""
        if not request.user.is_authenticated:
            return False
        if request.user.role in [User.Role.ADMIN, User.Role.RH]:
            return True
        return (
            request.user.role == User.Role.EMPLOYEE
            and hasattr(request.user, "employee_profile")
            and request.user.employee_profile.is_department_manager
        )

    def has_object_permission(self, request, view, obj) -> bool:
        """Pour les managers, restreint l'action aux membres de leur département."""
        if request.user.role in [User.Role.ADMIN, User.Role.RH]:
            return True
        try:
            manager_profile = request.user.employee_profile
        except AttributeError:
            return False
        if not manager_profile.is_department_manager or not manager_profile.department:
            return False

        # Résolution générique du département de l'objet cible.
        # Supporte : LeaveRequest/DisciplinaryAction/Payroll (obj.employee),
        # Employee (obj directement), Task (obj.assignee).
        if hasattr(obj, "employee") and obj.employee is not None:
            target_employee = obj.employee
        elif hasattr(obj, "assignee") and obj.assignee is not None:
            target_employee = obj.assignee
        elif hasattr(obj, "department"):
            # obj est un Employee
            if obj.user_id == request.user.id:
                return False
            return obj.department == manager_profile.department
        else:
            return False

        # Un manager ne peut pas agir sur ses propres données.
        if target_employee.user_id == request.user.id:
            return False
        return target_employee.department == manager_profile.department
