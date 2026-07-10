from __future__ import annotations

import logging

from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.performance.models import Skill
from smart_hr.performance.serializers import SkillSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class SkillViewSet(viewsets.ModelViewSet):
    """Cartographie des compétences par employé."""

    serializer_class = SkillSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "category", "employee__first_name", "employee__last_name"]
    ordering_fields = ["name", "category", "level", "created_at"]
    ordering = ["category", "name"]

    def get_queryset(self):
        user = self.request.user
        base = Skill.objects.select_related("employee__user")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            employee_id = self.request.query_params.get("employee_id")
            category = self.request.query_params.get("category")
            if employee_id:
                base = base.filter(employee_id=employee_id)
            if category:
                valid_categories = {c[0] for c in Skill.SkillCategory.choices}
                if category in valid_categories:
                    base = base.filter(category=category)
            return base

        return base.filter(employee=user.employee_profile)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
