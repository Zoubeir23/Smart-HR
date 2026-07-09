from __future__ import annotations

from django.db.models import Q
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.performance.models import CoachingSession
from smart_hr.performance.serializers import CoachingSessionSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH


class CoachingSessionViewSet(viewsets.ModelViewSet):
    """Sessions de coaching one-to-one : planifiées par RH/Admin, consultées par
    les participants (coach et coaché)."""

    serializer_class = CoachingSessionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["topic", "notes"]
    ordering_fields = ["scheduled_at", "status"]
    ordering = ["-scheduled_at"]

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        base = CoachingSession.objects.select_related("coach__user", "coachee__user")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            return base

        employee = getattr(user, "employee_profile", None)
        if employee is None:
            return base.none()
        return base.filter(Q(coach=employee) | Q(coachee=employee))
