from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.db.models import Avg

if TYPE_CHECKING:
    from datetime import date
from django.db.models import Count
from django.db.models import Q
from django.db.models import Sum
from django.utils import timezone
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

_AGE_GROUPS = [
    ("18-25", 18, 25),
    ("26-35", 26, 35),
    ("36-45", 36, 45),
    ("46-55", 46, 55),
    ("56+", 56, 120),
]

_SALARY_BRACKETS = [
    ("< 200k", 0, 200_000),
    ("200-400k", 200_000, 400_000),
    ("400-700k", 400_000, 700_000),
    ("700k-1M", 700_000, 1_000_000),
    ("> 1M", 1_000_000, None),
]


def _compute_age(dob: date) -> int:
    today = timezone.now().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


class HRAnalyticsView(APIView):
    """
    GET /api/v1/stats/overview/
    Analytiques RH aggregees : pyramide des ages, distribution salaires,
    effectifs par departement, resume conges, absences, masse salariale.
    Reserve aux RH et Admin.
    """

    permission_classes = [IsRH]

    def get(self, request) -> Response:
        from smart_hr.conge.models import LeaveRequest as Conge
        from smart_hr.personnel.models import Employee
        from smart_hr.presence.models import Attendance as Presence

        employees = Employee.objects.select_related("department", "user").filter(status="active")

        total_active = employees.count()
        total_salary_mass = employees.aggregate(total=Sum("salary"))["total"] or 0
        average_salary = employees.aggregate(avg=Avg("salary"))["avg"] or 0

        age_pyramid = self._build_age_pyramid(employees)
        salary_distribution = self._build_salary_distribution(employees)
        department_headcount = self._build_department_headcount()
        leave_summary = self._build_leave_summary(Conge)
        attendance_summary = self._build_attendance_summary(Presence)
        churn_summary = self._build_churn_summary(employees)
        monthly_headcount = self._build_monthly_headcount(Employee)
        training_summary = self._build_training_summary()

        return Response(
            {
                "totals": {
                    "active_employees": total_active,
                    "salary_mass": float(total_salary_mass),
                    "average_salary": round(float(average_salary), 2),
                },
                "age_pyramid": age_pyramid,
                "salary_distribution": salary_distribution,
                "department_headcount": department_headcount,
                "leave_summary": leave_summary,
                "attendance_summary": attendance_summary,
                "churn_summary": churn_summary,
                "monthly_headcount": monthly_headcount,
                "training_summary": training_summary,
            }
        )

    def _build_age_pyramid(self, employees) -> list[dict]:
        """Distribution des employes par groupe d'age."""
        employees_with_dob = [e for e in employees if e.date_of_birth]
        ages = [_compute_age(e.date_of_birth) for e in employees_with_dob]

        result = []
        for label, age_min, age_max in _AGE_GROUPS:
            count = sum(1 for age in ages if age_min <= age <= age_max)
            result.append({"group": label, "count": count})
        return result

    def _build_salary_distribution(self, employees) -> list[dict]:
        """Distribution des salaires par tranche."""
        result = []
        brackets = _SALARY_BRACKETS
        for index, (label, salary_min, salary_max) in enumerate(brackets):
            is_last_bracket = index == len(brackets) - 1
            if is_last_bracket:
                count = employees.filter(salary__gte=salary_min).count()
            else:
                count = employees.filter(salary__gte=salary_min, salary__lt=salary_max).count()
            result.append({"bracket": label, "count": count})
        return result

    def _build_department_headcount(self) -> list[dict]:
        """Effectif actif par departement."""
        from smart_hr.personnel.models import Employee

        dept_data = (
            Employee.objects.filter(status="active", department__isnull=False)
            .values("department__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:10]
        )
        result = [{"department": entry["department__name"], "count": entry["count"]} for entry in dept_data]
        unassigned = Employee.objects.filter(status="active", department__isnull=True).count()
        if unassigned > 0:
            result.append({"department": "Non assigne", "count": unassigned})
        return result

    def _build_leave_summary(self, conge_model) -> dict:
        """Resume des conges de l'annee en cours."""
        current_year = timezone.now().year
        leaves_this_year = conge_model.objects.filter(
            start_date__year=current_year,
        )
        total = leaves_this_year.count()
        by_status = dict(leaves_this_year.values("status").annotate(count=Count("id")).values_list("status", "count"))
        return {
            "total": total,
            "approved": by_status.get("approved", 0),
            "pending": by_status.get("pending", 0),
            "rejected": by_status.get("rejected", 0),
        }

    def _build_attendance_summary(self, presence_model) -> dict:
        """Resume des presences du mois en cours."""
        now = timezone.now()
        presences_this_month = presence_model.objects.filter(date__year=now.year, date__month=now.month)
        total = presences_this_month.count()
        by_status = dict(presences_this_month.values("status").annotate(count=Count("id")).values_list("status", "count"))
        return {
            "total": total,
            "present": by_status.get("present", 0),
            "absent": by_status.get("absent", 0),
            "late": by_status.get("late", 0),
        }

    def _build_churn_summary(self, employees) -> dict:
        """Resume du risque de churn sur les employes actifs."""
        high_risk = employees.filter(churn_risk__gte=70).count()
        medium_risk = employees.filter(churn_risk__gte=40, churn_risk__lt=70).count()
        low_risk = employees.filter(churn_risk__lt=40, churn_risk__isnull=False).count()
        unscored = employees.filter(churn_risk__isnull=True).count()
        return {
            "high": high_risk,
            "medium": medium_risk,
            "low": low_risk,
            "unscored": unscored,
        }

    def _build_monthly_headcount(self, employee_model) -> list[dict]:
        """Evolution mensuelle des embauches sur les 12 derniers mois."""
        from django.db.models.functions import TruncMonth

        cutoff = timezone.now() - timezone.timedelta(days=365)
        monthly = (
            employee_model.objects.filter(hire_date__isnull=False, created_at__gte=cutoff)
            .annotate(month=TruncMonth("created_at"))
            .values("month")
            .annotate(new_hires=Count("id"))
            .order_by("month")
        )
        return [
            {
                "month": entry["month"].strftime("%b %Y"),
                "new_hires": entry["new_hires"],
            }
            for entry in monthly
        ]

    def _build_training_summary(self) -> dict:
        """Résumé des formations : coûts et taux de complétion, pour éviter le
        reporting manuel sous Excel (cf. audit comparatif TargetYM AI)."""
        from smart_hr.formation.models import Formation
        from smart_hr.formation.models import Participation

        cost_totals = Formation.objects.aggregate(total_cost=Sum("cost"), average_cost=Avg("cost"))
        participation_totals = Participation.objects.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Participation.Status.COMPLETED)),
        )
        total_participations = participation_totals["total"] or 0
        completed = participation_totals["completed"] or 0
        completion_rate = round((completed / total_participations) * 100, 1) if total_participations else 0.0

        return {
            "total_formations": Formation.objects.count(),
            "total_cost": float(cost_totals["total_cost"] or 0),
            "average_cost": round(float(cost_totals["average_cost"] or 0), 2),
            "total_participations": total_participations,
            "completed_participations": completed,
            "completion_rate": completion_rate,
        }
