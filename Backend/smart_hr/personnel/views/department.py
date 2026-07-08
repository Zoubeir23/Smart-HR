from collections import Counter

from django.db.models import Count
from django.db.models import Prefetch
from django.db.models import Q
from django.db.models import Sum
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.personnel.models import Service
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
        if self.action in ["list", "retrieve", "stats", "organigramme"]:
            return [IsAuthenticated()]
        return [IsRH()]

    @action(detail=False, methods=["get"])
    def organigramme(self, request):
        """Arborescence Département → Service → Poste avec effectifs actifs,
        pour générer automatiquement l'organigramme visuel (sans re-saisie
        manuelle — dérivé de la structure déjà existante).

        Les effectifs sont calculés en Python à partir d'un unique passage sur
        les employés actifs (au lieu d'une requête COUNT par département/service/
        poste), pour éviter le problème de requêtes N+1.

        Le tri des services/postes est appliqué au niveau des querysets passés
        à Prefetch() (et non via .order_by() après coup) : chaîner .order_by()
        sur une relation déjà préchargée ignore le cache de prefetch et
        redéclenche une requête par ligne parente.
        """
        departments = Department.objects.prefetch_related(
            Prefetch(
                "services",
                queryset=Service.objects.order_by("name").prefetch_related(
                    Prefetch("positions", queryset=Position.objects.order_by("title"))
                ),
            )
        ).order_by("name")

        active_employees = Employee.objects.filter(status="active").values("department_id", "service_id", "position_id")
        department_counts: Counter = Counter()
        service_counts: Counter = Counter()
        position_counts: Counter = Counter()
        for row in active_employees:
            department_counts[row["department_id"]] += 1
            if row["service_id"]:
                service_counts[row["service_id"]] += 1
            if row["position_id"]:
                position_counts[row["position_id"]] += 1

        managers_by_department = {
            employee.department_id: employee
            for employee in Employee.objects.filter(is_department_manager=True, status="active").select_related("user")
        }

        data = []
        for department in departments:
            services_data = []
            for service in department.services.all():
                positions_data = [
                    {
                        "id": position.pk,
                        "title": position.title,
                        "employee_count": position_counts.get(position.pk, 0),
                    }
                    for position in service.positions.all()
                ]
                services_data.append(
                    {
                        "id": service.pk,
                        "name": service.name,
                        "employee_count": service_counts.get(service.pk, 0),
                        "positions": positions_data,
                    }
                )
            manager = managers_by_department.get(department.pk)
            data.append(
                {
                    "id": department.pk,
                    "name": department.name,
                    "employee_count": department_counts.get(department.pk, 0),
                    "manager_name": manager.user.get_full_name() if manager else None,
                    "services": services_data,
                }
            )

        return Response(data)

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
