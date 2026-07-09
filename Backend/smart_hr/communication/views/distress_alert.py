from __future__ import annotations

from django.utils import timezone
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.communication.models import DistressAlert
from smart_hr.communication.serializers import DistressAlertSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH


class DistressAlertViewSet(viewsets.ModelViewSet):
    """Alertes de détresse : un employé déclenche une alerte le concernant,
    RH/Admin suivent son traitement jusqu'à résolution."""

    serializer_class = DistressAlertSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["created_at", "status"]
    ordering = ["-created_at"]

    def get_permissions(self):
        if self.action in ["update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        base = DistressAlert.objects.select_related("employee__user", "handled_by")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            status_param = self.request.query_params.get("status")
            if status_param:
                valid_statuses = {c[0] for c in DistressAlert.Status.choices}
                if status_param in valid_statuses:
                    base = base.filter(status=status_param)
            return base

        employee = getattr(user, "employee_profile", None)
        if employee is None:
            return base.none()
        return base.filter(employee=employee)

    def perform_create(self, serializer):
        employee = getattr(self.request.user, "employee_profile", None)
        serializer.save(employee=employee)

    def perform_update(self, serializer):
        status_changed_to_resolved = serializer.validated_data.get("status") == DistressAlert.Status.RESOLVED
        extra = {"handled_by": self.request.user}
        if status_changed_to_resolved and not serializer.instance.resolved_at:
            extra["resolved_at"] = timezone.now()
        serializer.save(**extra)
