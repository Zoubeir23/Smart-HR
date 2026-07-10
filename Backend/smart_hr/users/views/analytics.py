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

_PERIOD_DAYS = {
    "1m": 30,
    "3m": 90,
    "6m": 180,
    "1y": 365,
}


def _compute_age(dob: date) -> int:
    today = timezone.now().date()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))


def _collect_department_and_descendant_ids(department_id: int) -> set[int]:
    """Retourne l'id fourni plus tous ses descendants dans l'organigramme
    (profondeur arbitraire), pour qu'un filtre sur une unité englobe aussi
    ses sous-unités. Le nombre d'itérations est borné par le nombre total de
    départements pour éviter toute boucle infinie sur un cycle préexistant."""
    from smart_hr.personnel.models import Department

    all_departments = list(Department.objects.values("id", "parent_id"))
    children_by_parent: dict[int, list[int]] = {}
    for entry in all_departments:
        if entry["parent_id"] is not None:
            children_by_parent.setdefault(entry["parent_id"], []).append(entry["id"])

    collected = {department_id}
    frontier = [department_id]
    for _ in range(len(all_departments) + 1):
        next_frontier = [
            child_id for parent_id in frontier for child_id in children_by_parent.get(parent_id, []) if child_id not in collected
        ]
        if not next_frontier:
            break
        collected.update(next_frontier)
        frontier = next_frontier
    return collected


class HRAnalyticsView(APIView):
    """
    GET /api/v1/stats/overview/
    Analytiques RH aggregees : pyramide des ages, distribution salaires,
    effectifs par departement, resume conges, absences, masse salariale.
    Reserve aux RH et Admin.
    """

    permission_classes = [IsRH]

    def get(self, request) -> Response:
        department_ids, department = self._parse_department_filter(request)
        since_date = self._parse_since_date(request)
        return Response(self._build_overview_data(department_ids, department, since_date))

    def _parse_department_filter(self, request):
        """Lit `?department_id=` : retourne (ids_du_sous-arbre ou None, le
        Department sélectionné ou None). Un id invalide/inexistant est
        silencieusement ignoré (pas de filtre) plutôt que de faire planter
        la requête — un filtre reste une bonification, jamais bloquant."""
        from smart_hr.personnel.models import Department

        raw_department_id = request.query_params.get("department_id")
        if not raw_department_id:
            return None, None
        try:
            department_id = int(raw_department_id)
            department = Department.objects.get(pk=department_id)
        except (ValueError, Department.DoesNotExist):
            return None, None
        return _collect_department_and_descendant_ids(department_id), department

    def _parse_since_date(self, request):
        """Lit `?period=` (1m/3m/6m/1y) : retourne la date de départ de la
        fenêtre temporelle. Valeur inconnue ou absente → 1 an (comportement
        historique de l'endpoint avant l'introduction de ce filtre)."""
        period = request.query_params.get("period")
        days = _PERIOD_DAYS.get(period, _PERIOD_DAYS["1y"])
        return timezone.now() - timezone.timedelta(days=days)

    def _build_overview_data(self, department_ids=None, department=None, since_date=None) -> dict:
        """Construit l'intégralité des données People Analytics — partagée
        entre l'endpoint JSON (`get`) et l'export Excel multi-onglets
        (`HRAnalyticsExportView`), pour ne jamais dupliquer les agrégations.

        `department_ids` (None = pas de filtre) restreint aux employés de
        l'unité choisie et de ses sous-unités. `since_date` (None = 1 an)
        restreint les indicateurs datés à une fenêtre glissante. Certains
        agrégats ne peuvent pas être filtrés proprement par département
        (recrutement : `JobOffer.department` est un champ texte libre, pas
        une relation vers `Department`) ou par période (performance : les
        évaluations sont annuelles, une fenêtre glissante infra-annuelle n'a
        pas de sens métier) — ce choix est documenté sur chaque méthode.
        """
        from smart_hr.conge.models import LeaveRequest as Conge
        from smart_hr.personnel.models import Employee
        from smart_hr.presence.models import Attendance as Presence

        if since_date is None:
            since_date = self._parse_since_date_default()

        employees = Employee.objects.select_related("department", "user").filter(status="active")
        if department_ids is not None:
            employees = employees.filter(department_id__in=department_ids)

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
            "department_headcount": self._build_department_headcount(department_ids),
            "leave_summary": self._build_leave_summary(Conge, department_ids, since_date),
            "attendance_summary": self._build_attendance_summary(Presence, department_ids, since_date),
            "churn_summary": self._build_churn_summary(employees),
            "monthly_headcount": self._build_monthly_headcount(Employee, department_ids, since_date),
            "training_summary": self._build_training_summary(department_ids, since_date),
            "performance_summary": self._build_performance_summary(department_ids),
            "recruitment_funnel": self._build_recruitment_funnel(department, since_date),
            "engagement_summary": self._build_engagement_summary(department_ids, since_date),
            "department_hierarchy": self._build_department_hierarchy(department_ids),
        }

    def _parse_since_date_default(self):
        return timezone.now() - timezone.timedelta(days=_PERIOD_DAYS["1y"])

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

    def _build_department_headcount(self, department_ids=None) -> list[dict]:
        """Effectif actif par departement (restreint au sous-arbre si un
        filtre de département est actif)."""
        from smart_hr.personnel.models import Employee

        employees = Employee.objects.filter(status="active", department__isnull=False)
        if department_ids is not None:
            employees = employees.filter(department_id__in=department_ids)

        dept_data = employees.values("department__name").annotate(count=Count("id")).order_by("-count")[:10]
        result = [{"department": entry["department__name"], "count": entry["count"]} for entry in dept_data]

        unassigned_qs = Employee.objects.filter(status="active", department__isnull=True)
        unassigned = unassigned_qs.count() if department_ids is None else 0
        if unassigned > 0:
            result.append({"department": "Non assigne", "count": unassigned})
        return result

    def _build_leave_summary(self, conge_model, department_ids=None, since_date=None) -> dict:
        """Resume des conges sur la fenetre de periode selectionnee."""
        leaves = conge_model.objects.filter(start_date__gte=since_date)
        if department_ids is not None:
            leaves = leaves.filter(employee__department_id__in=department_ids)
        total = leaves.count()
        by_status = dict(leaves.values("status").annotate(count=Count("id")).values_list("status", "count"))
        return {
            "total": total,
            "approved": by_status.get("approved", 0),
            "pending": by_status.get("pending", 0),
            "rejected": by_status.get("rejected", 0),
        }

    def _build_attendance_summary(self, presence_model, department_ids=None, since_date=None) -> dict:
        """Resume des presences sur la fenetre de periode selectionnee."""
        presences = presence_model.objects.filter(date__gte=since_date)
        if department_ids is not None:
            presences = presences.filter(employee__department_id__in=department_ids)
        total = presences.count()
        by_status = dict(presences.values("status").annotate(count=Count("id")).values_list("status", "count"))
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

    def _build_monthly_headcount(self, employee_model, department_ids=None, since_date=None) -> list[dict]:
        """Evolution mensuelle des embauches sur la fenetre de periode selectionnee."""
        from django.db.models.functions import TruncMonth

        monthly_qs = employee_model.objects.filter(hire_date__isnull=False, created_at__gte=since_date)
        if department_ids is not None:
            monthly_qs = monthly_qs.filter(department_id__in=department_ids)
        monthly = (
            monthly_qs.annotate(month=TruncMonth("created_at")).values("month").annotate(new_hires=Count("id")).order_by("month")
        )
        return [
            {
                "month": entry["month"].strftime("%b %Y"),
                "new_hires": entry["new_hires"],
            }
            for entry in monthly
        ]

    def _build_training_summary(self, department_ids=None, since_date=None) -> dict:
        """Résumé des formations : coûts et taux de complétion, pour éviter le
        reporting manuel sous Excel (cf. audit comparatif TargetYM AI). Les
        formations elles-mêmes sont restreintes à la fenêtre de période
        (`start_date`) ; les inscriptions sont en plus restreintes au
        département via l'employé inscrit."""
        from smart_hr.formation.models import Formation
        from smart_hr.formation.models import Participation

        formations = Formation.objects.filter(start_date__gte=since_date)
        cost_totals = formations.aggregate(total_cost=Sum("cost"), average_cost=Avg("cost"))

        participations = Participation.objects.filter(formation__start_date__gte=since_date)
        if department_ids is not None:
            participations = participations.filter(employee__department_id__in=department_ids)
        participation_totals = participations.aggregate(
            total=Count("id"),
            completed=Count("id", filter=Q(status=Participation.Status.COMPLETED)),
        )
        total_participations = participation_totals["total"] or 0
        completed = participation_totals["completed"] or 0
        completion_rate = round((completed / total_participations) * 100, 1) if total_participations else 0.0

        available_courses = formations.filter(end_date__gte=timezone.now()).count()
        cost_breakdown = [
            {"title": formation.title, "cost": float(formation.cost)} for formation in formations.order_by("-cost")[:10]
        ]

        return {
            "total_formations": formations.count(),
            "total_cost": float(cost_totals["total_cost"] or 0),
            "average_cost": round(float(cost_totals["average_cost"] or 0), 2),
            "total_participations": total_participations,
            "completed_participations": completed,
            "completion_rate": completion_rate,
            "available_courses": available_courses,
            "cost_breakdown": cost_breakdown,
        }

    def _build_performance_summary(self, department_ids=None) -> dict:
        """Résumé des évaluations de performance : score moyen et répartition
        par tranche, pour la vue d'ensemble People Analytics. Pas de filtre
        de période : les évaluations sont annuelles (`year`), une fenêtre
        glissante infra-annuelle n'a pas de sens métier ici."""
        from smart_hr.performance.models import PerformanceEvaluation

        evaluations = PerformanceEvaluation.objects.filter(global_score__isnull=False)
        if department_ids is not None:
            evaluations = evaluations.filter(employee__department_id__in=department_ids)
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

    def _build_recruitment_funnel(self, department=None, since_date=None) -> list[dict]:
        """Entonnoir de recrutement de A à Z : nombre de candidatures par
        étape du process, dans l'ordre du workflow, restreint à la fenêtre de
        période. `JobOffer.department` est un champ texte libre (pas une
        relation vers `Department`) — le filtre par département compare donc
        les noms (insensible à la casse), au mieux avec le modèle actuel."""
        from smart_hr.recruitment.models import Application

        applications = Application.objects.filter(created_at__gte=since_date)
        if department is not None:
            applications = applications.filter(job_offer__department__iexact=department.name)

        counts = dict(applications.values("status").annotate(count=Count("id")).values_list("status", "count"))
        return [
            {"status": status_value, "label": status_label, "count": counts.get(status_value, 0)}
            for status_value, status_label in Application.Status.choices
        ]

    def _build_engagement_summary(self, department_ids=None, since_date=None) -> dict:
        """Score d'engagement moyen à partir des questions de type "Note (1-5)"
        de toutes les enquêtes internes, restreint à la fenêtre de période
        (date de soumission) et, si un département est sélectionné, aux
        répondants ayant un profil employé dans ce département. Les réponses
        non numériques (ne devraient pas exister pour une question RATING,
        mais on reste défensif comme pour l'endpoint de résultats de survey)
        sont ignorées plutôt que de faire planter l'agrégat."""
        from smart_hr.survey.models import SurveyAnswer
        from smart_hr.survey.models import SurveyQuestion

        rating_answers = SurveyAnswer.objects.filter(
            question__question_type=SurveyQuestion.QuestionType.RATING,
            response__submitted_at__gte=since_date,
        )
        if department_ids is not None:
            rating_answers = rating_answers.filter(response__respondent__employee_profile__department_id__in=department_ids)

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

    def _build_department_hierarchy(self, department_ids=None) -> list[dict]:
        """Structure de l'organigramme (à profondeur arbitraire) avec
        l'effectif actif par département — le frontend reconstruit l'arbre à
        partir de `parent_id`, comme pour la page Organigramme existante.
        Restreinte au sous-arbre sélectionné si un filtre est actif."""
        from smart_hr.personnel.models import Department
        from smart_hr.personnel.models import Employee

        headcount_by_department = dict(
            Employee.objects.filter(status="active", department__isnull=False)
            .values("department_id")
            .annotate(count=Count("id"))
            .values_list("department_id", "count")
        )

        departments = Department.objects.all()
        if department_ids is not None:
            departments = departments.filter(id__in=department_ids)

        return [
            {
                "id": department.id,
                "name": department.name,
                "parent_id": department.parent_id,
                "unit_type": department.unit_type,
                "employee_count": headcount_by_department.get(department.id, 0),
            }
            for department in departments
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

        department_ids, department = self._parse_department_filter(request)
        since_date = self._parse_since_date(request)
        data = self._build_overview_data(department_ids, department, since_date)

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
