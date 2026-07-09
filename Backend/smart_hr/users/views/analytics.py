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
        return Response(self._build_overview_data())

    def _build_overview_data(self) -> dict:
        """Construit l'intégralité des données People Analytics — partagée
        entre l'endpoint JSON (`get`) et l'export Excel multi-onglets
        (`HRAnalyticsExportView`), pour ne jamais dupliquer les agrégations."""
        from smart_hr.conge.models import LeaveRequest as Conge
        from smart_hr.personnel.models import Employee
        from smart_hr.presence.models import Attendance as Presence

        employees = Employee.objects.select_related("department", "user").filter(status="active")

        total_active = employees.count()
        total_salary_mass = employees.aggregate(total=Sum("salary"))["total"] or 0
        average_salary = employees.aggregate(avg=Avg("salary"))["avg"] or 0

        return {
            "totals": {
                "active_employees": total_active,
                "salary_mass": float(total_salary_mass),
                "average_salary": round(float(average_salary), 2),
            },
            "age_pyramid": self._build_age_pyramid(employees),
            "salary_distribution": self._build_salary_distribution(employees),
            "department_headcount": self._build_department_headcount(),
            "leave_summary": self._build_leave_summary(Conge),
            "attendance_summary": self._build_attendance_summary(Presence),
            "churn_summary": self._build_churn_summary(employees),
            "monthly_headcount": self._build_monthly_headcount(Employee),
            "training_summary": self._build_training_summary(),
            "performance_summary": self._build_performance_summary(),
            "recruitment_funnel": self._build_recruitment_funnel(),
            "engagement_summary": self._build_engagement_summary(),
            "department_hierarchy": self._build_department_hierarchy(),
        }

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

        available_courses = Formation.objects.filter(end_date__gte=timezone.now()).count()
        cost_breakdown = [
            {"title": formation.title, "cost": float(formation.cost)} for formation in Formation.objects.order_by("-cost")[:10]
        ]

        return {
            "total_formations": Formation.objects.count(),
            "total_cost": float(cost_totals["total_cost"] or 0),
            "average_cost": round(float(cost_totals["average_cost"] or 0), 2),
            "total_participations": total_participations,
            "completed_participations": completed,
            "completion_rate": completion_rate,
            "available_courses": available_courses,
            "cost_breakdown": cost_breakdown,
        }

    def _build_performance_summary(self) -> dict:
        """Résumé des évaluations de performance : score moyen et répartition
        par tranche, pour la vue d'ensemble People Analytics."""
        from smart_hr.performance.models import PerformanceEvaluation

        evaluations = PerformanceEvaluation.objects.filter(global_score__isnull=False)
        evaluated_count = evaluations.count()
        average_score = evaluations.aggregate(avg=Avg("global_score"))["avg"] or 0

        bands = [
            ("Excellent (80-100)", 80, 100),
            ("Bon (60-79)", 60, 79),
            ("Moyen (40-59)", 40, 59),
            ("Faible (0-39)", 0, 39),
        ]
        distribution = [
            {"label": label, "count": evaluations.filter(global_score__gte=low, global_score__lte=high).count()}
            for label, low, high in bands
        ]

        return {
            "evaluated_count": evaluated_count,
            "average_score": round(float(average_score), 1),
            "distribution": distribution,
        }

    def _build_recruitment_funnel(self) -> list[dict]:
        """Entonnoir de recrutement de A à Z : nombre de candidatures par
        étape du process, dans l'ordre du workflow."""
        from smart_hr.recruitment.models import Application

        counts = dict(Application.objects.values("status").annotate(count=Count("id")).values_list("status", "count"))
        return [
            {"status": status_value, "label": status_label, "count": counts.get(status_value, 0)}
            for status_value, status_label in Application.Status.choices
        ]

    def _build_engagement_summary(self) -> dict:
        """Score d'engagement moyen à partir des questions de type "Note (1-5)"
        de toutes les enquêtes internes. Les réponses non numériques (ne
        devraient pas exister pour une question RATING, mais on reste
        défensif comme pour l'endpoint de résultats de survey) sont ignorées
        plutôt que de faire planter l'agrégat."""
        from smart_hr.survey.models import SurveyAnswer
        from smart_hr.survey.models import SurveyQuestion

        rating_answers = SurveyAnswer.objects.filter(question__question_type=SurveyQuestion.QuestionType.RATING)

        scores = []
        for answer in rating_answers:
            try:
                scores.append(float(answer.text_answer))
            except (TypeError, ValueError):
                continue

        return {
            "responses_count": len(scores),
            "average_rating": round(sum(scores) / len(scores), 1) if scores else 0.0,
        }

    def _build_department_hierarchy(self) -> list[dict]:
        """Structure de l'organigramme (à profondeur arbitraire) avec
        l'effectif actif par département — le frontend reconstruit l'arbre à
        partir de `parent_id`, comme pour la page Organigramme existante."""
        from smart_hr.personnel.models import Department
        from smart_hr.personnel.models import Employee

        headcount_by_department = dict(
            Employee.objects.filter(status="active", department__isnull=False)
            .values("department_id")
            .annotate(count=Count("id"))
            .values_list("department_id", "count")
        )

        return [
            {
                "id": department.id,
                "name": department.name,
                "parent_id": department.parent_id,
                "unit_type": department.unit_type,
                "employee_count": headcount_by_department.get(department.id, 0),
            }
            for department in Department.objects.all()
        ]


class HRAnalyticsExportView(HRAnalyticsView):
    """
    GET /api/v1/stats/overview/export/
    Exporte le tableau de bord People Analytics en un classeur Excel à
    onglets multiples (un onglet par section), pour permettre au RH/manager
    d'insérer les données directement dans une présentation sans recréer de
    graphiques manuellement (cf. audit comparatif TargetYM AI).
    """

    def get(self, request):
        from smart_hr.core.export_utils import build_multi_sheet_xlsx_response

        data = self._build_overview_data()

        sheets = {
            "Effectifs": [data["totals"]],
            "Pyramide des ages": data["age_pyramid"],
            "Distribution salaires": data["salary_distribution"],
            "Effectifs par departement": data["department_headcount"],
            "Conges": [data["leave_summary"]],
            "Presences": [data["attendance_summary"]],
            "Risque de churn": [data["churn_summary"]],
            "Embauches (12 mois)": data["monthly_headcount"],
            "Formations": [
                {k: v for k, v in data["training_summary"].items() if k != "cost_breakdown"},
            ],
            "Cout des formations": data["training_summary"]["cost_breakdown"],
            "Performance": [
                {k: v for k, v in data["performance_summary"].items() if k != "distribution"},
            ],
            "Repartition performance": data["performance_summary"]["distribution"],
            "Recrutement": data["recruitment_funnel"],
            "Engagement": [data["engagement_summary"]],
            "Organigramme": data["department_hierarchy"],
        }

        return build_multi_sheet_xlsx_response(sheets, "people_analytics.xlsx")
