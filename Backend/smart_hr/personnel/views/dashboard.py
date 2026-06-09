import logging
from datetime import date

from django.db.models import Avg
from django.db.models import Count
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

_AGE_BRACKETS = [
    ("18-25", 18, 25),
    ("26-35", 26, 35),
    ("36-45", 36, 45),
    ("46-55", 46, 55),
    ("56+", 56, 150),
]


def _compute_age(birth_date: date) -> int:
    today = date.today()
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))


class DashboardStatsView(APIView):
    """
    GET /api/v1/personnel/dashboard/
    Statistiques RH pour le dashboard : KPIs, pyramide des âges, rétention, churn.
    Accessible RH et Admin uniquement.
    """

    permission_classes = [IsRH]

    def get(self, request):
        from smart_hr.conge.models import LeaveRequest
        from smart_hr.personnel.models import Employee
        from smart_hr.tache.models import Task

        employees = Employee.objects.select_related("user", "department").filter(status="active")
        all_employees = Employee.objects.all()

        total_active = employees.count()
        total_all = all_employees.count()
        retention_rate = round((total_active / total_all * 100), 1) if total_all else 0

        pending_leaves = LeaveRequest.objects.filter(status=LeaveRequest.Status.PENDING).count()
        ongoing_tasks = Task.objects.filter(status__in=["in_progress", "in_review"]).count()

        avg_churn_risk = employees.aggregate(avg=Avg("churn_risk"))["avg"]
        avg_churn_risk = round(avg_churn_risk, 1) if avg_churn_risk is not None else 0
        high_risk_count = employees.filter(churn_risk__gte=70).count()
        medium_risk_count = employees.filter(churn_risk__gte=40, churn_risk__lt=70).count()

        age_pyramid = []
        for label, age_min, age_max in _AGE_BRACKETS:
            bracket_count = 0
            for employee in employees:
                if employee.user.birth_date:
                    age = _compute_age(employee.user.birth_date)
                    if age_min <= age <= age_max:
                        bracket_count += 1
            age_pyramid.append({"bracket": label, "count": bracket_count})

        department_distribution = list(
            employees.values("department__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        department_distribution = [
            {"department": entry["department__name"] or "Non assigné", "count": entry["count"]}
            for entry in department_distribution
        ]

        avg_salary = employees.aggregate(avg=Avg("salary"))["avg"]
        avg_salary = round(float(avg_salary), 2) if avg_salary is not None else 0

        recent_hires_count = employees.filter(
            hire_date__gte=date.today().replace(month=max(1, date.today().month - 3)),
        ).count()

        return Response(
            {
                "kpis": {
                    "total_active_employees": total_active,
                    "retention_rate": retention_rate,
                    "pending_leaves": pending_leaves,
                    "ongoing_tasks": ongoing_tasks,
                    "avg_salary": avg_salary,
                    "recent_hires_last_3_months": recent_hires_count,
                },
                "churn": {
                    "avg_risk": avg_churn_risk,
                    "high_risk_count": high_risk_count,
                    "medium_risk_count": medium_risk_count,
                },
                "age_pyramid": age_pyramid,
                "department_distribution": department_distribution,
            }
        )
