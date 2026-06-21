from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.personnel.models import Position
from smart_hr.personnel.serializers import PositionSerializer
from smart_hr.users.permissions import IsRH


class PositionViewSet(viewsets.ModelViewSet):
    """API CRUD des postes, avec filtrage par service ou département."""

    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["title", "service__name", "service__department__name"]
    ordering_fields = ["title", "service__name"]
    ordering = ["title"]

    def get_queryset(self):
        queryset = Position.objects.select_related("service__department").prefetch_related("employees")
        service_id = self.request.query_params.get("service")
        department_id = self.request.query_params.get("department")
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        if department_id:
            queryset = queryset.filter(service__department_id=department_id)
        return queryset

    def get_serializer_class(self):
        return PositionSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]
