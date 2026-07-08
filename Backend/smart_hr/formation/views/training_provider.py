from __future__ import annotations

from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.formation.models import TrainingProvider
from smart_hr.formation.serializers import TrainingProviderSerializer
from smart_hr.users.permissions import IsRH


class TrainingProviderViewSet(viewsets.ModelViewSet):
    """Annuaire des fournisseurs de formation (internes ou externes)."""

    queryset = TrainingProvider.objects.all()
    serializer_class = TrainingProviderSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "created_at"]
    ordering = ["name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        provider_type = self.request.query_params.get("provider_type")
        if provider_type in TrainingProvider.ProviderType.values:
            queryset = queryset.filter(provider_type=provider_type)
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
