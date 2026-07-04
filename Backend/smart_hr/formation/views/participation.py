from __future__ import annotations

import logging

from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.formation.models import Participation
from smart_hr.formation.serializers import ParticipationSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class ParticipationViewSet(viewsets.ModelViewSet):
    """Inscriptions des employés aux formations."""

    serializer_class = ParticipationSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["enrolled_at", "status", "formation__title"]
    ordering = ["-enrolled_at"]

    def get_queryset(self):
        user = self.request.user
        base = Participation.objects.select_related("employee__user", "formation")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            formation_id = self.request.query_params.get("formation_id")
            employee_id = self.request.query_params.get("employee_id")
            if formation_id:
                base = base.filter(formation_id=formation_id)
            if employee_id:
                base = base.filter(employee_id=employee_id)
            return base

        return base.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
