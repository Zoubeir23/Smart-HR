from __future__ import annotations

import logging

from django.db.models import Avg
from django.db.models import Count
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.performance.models import PerformanceEvaluation
from smart_hr.performance.serializers import PerformanceEvaluationSerializer
from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class PerformanceEvaluationViewSet(viewsets.ModelViewSet):
    """Évaluations annuelles de performance des employés."""

    serializer_class = PerformanceEvaluationSerializer
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["employee__first_name", "employee__last_name", "objectives", "achievements"]
    ordering_fields = ["year", "global_score", "status", "created_at"]
    ordering = ["-year"]

    def get_queryset(self):
        user = self.request.user
        base = PerformanceEvaluation.objects.select_related("employee__user", "reviewer__user")

        if user.role in [User.Role.ADMIN, User.Role.RH]:
            year = self.request.query_params.get("year")
            status = self.request.query_params.get("status")
            employee_id = self.request.query_params.get("employee_id")
            if year and year.isdigit():
                base = base.filter(year=year)
            if status:
                valid_statuses = {c[0] for c in PerformanceEvaluation.EvaluationStatus.choices}
                if status in valid_statuses:
                    base = base.filter(status=status)
            if employee_id:
                base = base.filter(employee_id=employee_id)
            return base

        return base.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        try:
            from smart_hr.personnel.models import Employee

            reviewer_employee = Employee.objects.get(user=self.request.user)
            serializer.save(reviewer=reviewer_employee)
        except Employee.DoesNotExist:
            serializer.save()

    @action(detail=False, methods=["get"], url_path="stats")
    def stats(self, request):
        """Statistiques agrégées (RH/Admin uniquement)."""
        if request.user.role not in [User.Role.ADMIN, User.Role.RH]:
            return Response(status=status.HTTP_403_FORBIDDEN)

        total = PerformanceEvaluation.objects.count()
        average_score = PerformanceEvaluation.objects.filter(global_score__isnull=False).aggregate(avg=Avg("global_score"))["avg"]
        by_status = list(PerformanceEvaluation.objects.values("status").annotate(count=Count("id")))
        by_year = list(PerformanceEvaluation.objects.values("year").annotate(avg_score=Avg("global_score")).order_by("-year")[:5])

        return Response(
            {
                "total": total,
                "average_score": round(average_score, 1) if average_score else None,
                "by_status": by_status,
                "by_year": by_year,
            }
        )
