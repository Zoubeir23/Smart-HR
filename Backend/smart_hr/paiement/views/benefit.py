from __future__ import annotations

from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.paiement.models import BenefitPlan
from smart_hr.paiement.models import EmployeeBenefit
from smart_hr.paiement.serializers import BenefitPlanSerializer
from smart_hr.paiement.serializers import EmployeeBenefitSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH


class BenefitPlanViewSet(viewsets.ModelViewSet):
    """Catalogue des plans d'avantages (compensations & bénéfices) : géré par
    RH/Admin, consultable par tous les utilisateurs internes authentifiés."""

    serializer_class = BenefitPlanSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "description"]
    ordering_fields = ["name", "category", "created_at"]
    ordering = ["category", "name"]
    queryset = BenefitPlan.objects.prefetch_related("enrollments").all()

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]


class EmployeeBenefitViewSet(viewsets.ModelViewSet):
    """Inscriptions des employés aux plans d'avantages : gérées par RH/Admin,
    consultées par l'employé concerné (ses propres inscriptions) ou par RH/Admin
    (toutes)."""

    serializer_class = EmployeeBenefitSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["enrolled_at", "status"]
    ordering = ["-enrolled_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        base = EmployeeBenefit.objects.select_related("employee__user", "plan")
        if user.role in [User.Role.ADMIN, User.Role.RH]:
            employee_id = self.request.query_params.get("employee")
            if employee_id:
                base = base.filter(employee_id=employee_id)
            return base
        employee = getattr(user, "employee_profile", None)
        if employee is None:
            return base.none()
        return base.filter(employee=employee)
