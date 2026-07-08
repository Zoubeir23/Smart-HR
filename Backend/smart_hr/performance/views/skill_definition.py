from __future__ import annotations

from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.performance.models import Skill
from smart_hr.performance.models import SkillDefinition
from smart_hr.performance.serializers import SkillDefinitionSerializer
from smart_hr.users.permissions import IsRH


class SkillDefinitionViewSet(viewsets.ModelViewSet):
    """Référentiel de compétences de l'entreprise — catalogue centralisé maintenu par les RH."""

    queryset = SkillDefinition.objects.all()
    serializer_class = SkillDefinitionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name"]
    ordering_fields = ["name", "category", "created_at"]
    ordering = ["category", "name"]

    def get_queryset(self):
        queryset = super().get_queryset()
        category = self.request.query_params.get("category")
        if category:
            valid_categories = {c[0] for c in Skill.SkillCategory.choices}
            if category in valid_categories:
                queryset = queryset.filter(category=category)
        return queryset

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
