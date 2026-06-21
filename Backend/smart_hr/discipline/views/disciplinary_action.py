import logging

from django.db.models import Count
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.discipline.models import DisciplinaryAction
from smart_hr.discipline.serializers import DisciplinaryActionSerializer
from smart_hr.personnel.models import Employee
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class DisciplinaryActionViewSet(viewsets.ModelViewSet):
    """Gestion des actions disciplinaires : avertissements, rappels à l'ordre, suspensions."""

    serializer_class = DisciplinaryActionSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "reason",
        "action_type",
    ]
    ordering_fields = ["issued_date", "incident_date", "action_type", "created_at"]
    ordering = ["-issued_date"]

    def get_queryset(self):
        """RH/Admin voient tout. L'employé voit uniquement ses propres sanctions."""
        user = self.request.user
        base = DisciplinaryAction.objects.select_related(
            "employee__user",
            "employee__department",
            "issued_by",
        )

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            employee_id = self.request.query_params.get("employee_id")
            action_type = self.request.query_params.get("action_type")

            if employee_id:
                base = base.filter(employee_id=employee_id)
            if action_type:
                valid_types = {c[0] for c in DisciplinaryAction.ActionType.choices}
                if action_type in valid_types:
                    base = base.filter(action_type=action_type)
            return base

        try:
            employee = Employee.objects.get(user=user)
        except Employee.DoesNotExist:
            return DisciplinaryAction.objects.none()

        return base.filter(employee=employee)

    def get_permissions(self):
        """Lecture : tout utilisateur authentifié. Écriture : RH/Admin uniquement."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Enregistre automatiquement l'émetteur de la sanction."""
        serializer.save(issued_by=self.request.user)

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Statistiques des actions disciplinaires (RH/Admin uniquement)."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=403)

        total = DisciplinaryAction.objects.count()
        by_type = list(DisciplinaryAction.objects.values("action_type").annotate(count=Count("id")).order_by("-count"))
        by_department = list(
            DisciplinaryAction.objects.values("employee__department__name").annotate(count=Count("id")).order_by("-count")
        )

        return Response(
            {
                "total": total,
                "by_type": by_type,
                "by_department": by_department,
            }
        )
