from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.personnel.models import Service
from smart_hr.personnel.serializers import ServiceSerializer
from smart_hr.users.permissions import IsRH


class ServiceViewSet(viewsets.ModelViewSet):
    """API CRUD des services (niveau intermédiaire Département ➔ Service ➔ Poste)."""

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "department__name"]
    ordering_fields = ["name", "department__name", "created_at"]
    ordering = ["department__name", "name"]

    def get_queryset(self):
        queryset = Service.objects.select_related("department").prefetch_related("employees", "positions")
        department_id = self.request.query_params.get("department")
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        return queryset

    def get_serializer_class(self):
        return ServiceSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]
