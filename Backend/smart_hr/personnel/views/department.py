from django.db.models import Count
from django.db.models import Q
from django.db.models import Sum
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import Department
from smart_hr.personnel.serializers import DepartmentDetailSerializer
from smart_hr.personnel.serializers import DepartmentSerializer
from smart_hr.users.permissions import IsRH


class DepartmentViewSet(viewsets.ModelViewSet):
    """API CRUD des départements avec stats enrichies."""

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        """Retourne tous les départements avec prefetch pour éviter le N+1.

        prefetch_related("employees", "positions") permet à get_employee_count
        et get_positions dans le serializer de ne pas déclencher de requêtes supplémentaires.
        """
        return Department.objects.prefetch_related("employees", "services").all()

    def get_serializer_class(self):
        """Utilise le serializer enrichi pour retrieve, sinon le de base."""
        if self.action == "retrieve":
            return DepartmentDetailSerializer
        return DepartmentSerializer

    def get_permissions(self):
        """Lecture ouverte aux authentifiés, écriture réservée RH/Admin."""
        if self.action in ["list", "retrieve", "stats"]:
            return [IsAuthenticated()]
        return [IsRH()]

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Vue d'ensemble de tous les départements : effectifs et masse salariale.

        Accessible à tous les utilisateurs authentifiés.
        Utilise annotate pour tout calculer en une seule requête SQL.
        """
        departments = Department.objects.annotate(
            total_employees=Count("employees"),
            active_employees=Count(
                "employees",
                filter=Q(employees__status="active"),
            ),
            total_salary=Sum("employees__salary"),
        ).order_by("-active_employees")

        data = [
            {
                "id": dept.id,
                "name": dept.name,
                "description": dept.description,
                "total_employees": dept.total_employees,
                "active_employees": dept.active_employees,
                "total_salary": float(dept.total_salary or 0),
            }
            for dept in departments
        ]
        return Response(data)
