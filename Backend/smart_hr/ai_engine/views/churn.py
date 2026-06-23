import logging
from pathlib import Path

from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from smart_hr.ai_engine.models import ChurnPrediction
from smart_hr.ai_engine.serializers import ChurnPredictionSerializer
from smart_hr.personnel.models import Employee
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

MODEL_PATH = Path(__file__).resolve().parent.parent / "ml_models" / "churn_model.pkl"

# Ordre des colonnes correspondant exactement à l'entraînement du modèle
FEATURE_COLUMNS = [
    "salary",
    "tenure_years",
    "leave_count",
    "absence_count",
    "disciplinary_count",
    "avg_performance_score",
    "unpaid_payroll_count",
]

_FEATURE_LABELS = {
    "salary": "Salaire bas",
    "tenure_years": "Ancienneté courte",
    "leave_count": "Nombre élevé de congés",
    "absence_count": "Absences fréquentes",
    "disciplinary_count": "Actions disciplinaires",
    "avg_performance_score": "Score de performance faible",
    "unpaid_payroll_count": "Fiches de paie impayées",
}

_RECOMMENDATIONS = {
    "salary": "Envisager une révision salariale pour cet employé.",
    "tenure_years": "Renforcer l'engagement dès les premières années (onboarding, mentorat).",
    "leave_count": "Investiguer les raisons d'une utilisation intensive des congés.",
    "absence_count": "Planifier un entretien pour comprendre les absences répétées.",
    "disciplinary_count": "Mettre en place un plan d'accompagnement disciplinaire.",
    "avg_performance_score": "Proposer un plan de développement des compétences.",
    "unpaid_payroll_count": "Vérifier et régulariser les retards de paiement.",
}


def _load_model():
    """Charge le modèle churn depuis le fichier .pkl. Retourne None si absent."""
    if not MODEL_PATH.exists():
        return None
    try:
        import joblib

        return joblib.load(MODEL_PATH)
    except Exception as exc:
        logger.error("Impossible de charger le modèle churn : %s", exc)
        return None


def _employee_to_features(employee: Employee) -> dict:
    """Extrait les features réelles depuis les données de l'employé en DB."""
    from django.utils import timezone

    from smart_hr.conge.models import LeaveRequest
    from smart_hr.discipline.models import DisciplinaryAction
    from smart_hr.paiement.models import Payroll
    from smart_hr.performance.models import PerformanceEvaluation
    from smart_hr.presence.models import Attendance

    # Ancienneté
    tenure_years = 0.0
    if employee.hire_date:
        tenure_years = round((timezone.now().date() - employee.hire_date).days / 365, 2)

    # Nombre de congés approuvés sur les 12 derniers mois
    one_year_ago = timezone.now().date().replace(year=timezone.now().year - 1)
    leave_count = LeaveRequest.objects.filter(
        employee=employee,
        status=LeaveRequest.Status.APPROVED,
        start_date__gte=one_year_ago,
    ).count()

    # Nombre d'absences sur les 12 derniers mois
    absence_count = Attendance.objects.filter(
        employee=employee,
        status=Attendance.Status.ABSENT,
        date__gte=one_year_ago,
    ).count()

    # Nombre d'actions disciplinaires
    disciplinary_count = DisciplinaryAction.objects.filter(employee=employee).count()

    # Score de performance moyen (0 si aucune évaluation)
    perf_scores = list(
        PerformanceEvaluation.objects.filter(
            employee=employee,
            global_score__isnull=False,
        ).values_list("global_score", flat=True)
    )
    avg_performance_score = round(sum(perf_scores) / len(perf_scores), 2) if perf_scores else 50.0

    # Nombre de fiches de paie non payées
    unpaid_payroll_count = Payroll.objects.filter(
        employee=employee,
        status__in=[Payroll.Status.PENDING],
    ).count()

    return {
        "salary": float(employee.salary) if employee.salary else 0.0,
        "tenure_years": tenure_years,
        "leave_count": leave_count,
        "absence_count": absence_count,
        "disciplinary_count": disciplinary_count,
        "avg_performance_score": avg_performance_score,
        "unpaid_payroll_count": unpaid_payroll_count,
    }


def _explain_prediction(model, features: dict) -> tuple[str, list[str]]:
    """Retourne le facteur principal et le top-3 des facteurs via feature_importances_."""
    try:
        importances = model.feature_importances_
        ranked = sorted(
            zip(FEATURE_COLUMNS, importances, strict=True),
            key=lambda x: x[1],
            reverse=True,
        )
        top_features = [col for col, _ in ranked[:3]]
        main_feature = top_features[0]
        main_label = _FEATURE_LABELS.get(main_feature, main_feature)
        top_labels = [_FEATURE_LABELS.get(col, col) for col in top_features]
        return main_label, top_labels
    except Exception:
        return "Facteur indéterminé", list(features.keys())


def _build_recommendations(risk_score: float, main_risk_factor: str) -> list[str]:
    """Génère des recommandations basées sur le score et le facteur principal."""
    if risk_score < 40:
        return []
    feature_key = next(
        (k for k, v in _FEATURE_LABELS.items() if v == main_risk_factor),
        None,
    )
    recommendations = []
    if feature_key and feature_key in _RECOMMENDATIONS:
        recommendations.append(_RECOMMENDATIONS[feature_key])
    if risk_score >= 70:
        recommendations.append("Planifier un entretien individuel en priorité.")
    return recommendations


def _notify_rh_high_churn_risk(employee: "Employee", risk_score: float, main_risk_factor: str) -> None:
    """Envoie une alerte email à tous les RH pour un employé à haut risque."""
    from smart_hr.core.email_service import send_churn_alert_to_rh
    from smart_hr.users.models import User

    rh_users = User.objects.filter(role__in=[User.Role.RH, User.Role.ADMIN], is_active=True)
    employee_full_name = employee.user.get_full_name() or employee.user.username
    department_name = employee.department.name if employee.department else ""

    for rh_user in rh_users:
        try:
            send_churn_alert_to_rh(
                rh_email=rh_user.email,
                rh_first_name=rh_user.first_name or rh_user.username,
                employee_full_name=employee_full_name,
                risk_score=risk_score,
                main_risk_factor=main_risk_factor,
                employee_department=department_name,
            )
        except Exception:
            logger.exception("Échec alerte churn à %s", rh_user.email)


class ChurnPredictionViewSet(viewsets.ReadOnlyModelViewSet):
    """Expose les prédictions de churn et les actions de scoring IA."""

    serializer_class = ChurnPredictionSerializer
    permission_classes = [IsRH]

    def get_queryset(self):
        """Retourne l'historique des prédictions avec les relations utiles préchargées."""
        return ChurnPrediction.objects.select_related(
            "employee__user",
            "employee__department",
        ).all()

    @action(detail=False, methods=["get"], url_path="high-risk")
    def high_risk(self, request):
        """Retourne uniquement les prédictions à risque ÉLEVÉ."""
        qs = self.get_queryset().filter(risk_level=ChurnPrediction.RiskLevel.HIGH)
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path=r"predict/(?P<employee_id>[^/.]+)")
    def predict(self, request, employee_id=None):
        """Lance une prédiction churn pour un employé donné."""
        try:
            employee = Employee.objects.select_related(
                "user",
                "department",
                "position",
            ).get(pk=employee_id)
        except Employee.DoesNotExist:
            return Response(
                {"detail": "Employé introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )

        model = _load_model()
        if model is None:
            return Response(
                {"detail": "Le modèle de prédiction n'est pas encore entraîné."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            import numpy as np

            features = _employee_to_features(employee)
            X = np.array([[features[col] for col in FEATURE_COLUMNS]])
            proba = model.predict_proba(X)[0][1]
            risk_score = round(proba * 100, 2)

            if risk_score >= 70:
                risk_level = ChurnPrediction.RiskLevel.HIGH
            elif risk_score >= 40:
                risk_level = ChurnPrediction.RiskLevel.MEDIUM
            else:
                risk_level = ChurnPrediction.RiskLevel.LOW

            main_risk_factor, top_factors = _explain_prediction(model, features)
            recommendations = _build_recommendations(risk_score, main_risk_factor)

            prediction = ChurnPrediction.objects.create(
                employee=employee,
                risk_score=risk_score,
                risk_level=risk_level,
                main_risk_factor=main_risk_factor,
                factors=top_factors,
                recommendations=recommendations,
            )
            employee.churn_risk = risk_score
            employee.save(update_fields=["churn_risk"])

            if risk_level == ChurnPrediction.RiskLevel.HIGH:
                _notify_rh_high_churn_risk(employee, risk_score, main_risk_factor)

            serializer = self.get_serializer(prediction)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        except Exception as exc:
            logger.error("Erreur lors de la prédiction churn : %s", exc)
            return Response(
                {"detail": "Erreur lors de la prédiction."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=False, methods=["post"], url_path="predict-all")
    def predict_all(self, request):
        """Déclenche la prédiction churn globale.

        Utilise Celery si un broker est disponible ; sinon bascule en exécution synchrone.
        """
        from smart_hr.ai_engine.tasks import predict_all_employees_task

        try:
            predict_all_employees_task.delay()
        except Exception:
            logger.warning(
                "Broker Celery indisponible — exécution synchrone de la prédiction churn globale.",
            )
            predict_all_employees_task()
            return Response(
                {"detail": "Prédiction globale exécutée (mode synchrone, sans Celery)."},
                status=status.HTTP_200_OK,
            )
        return Response(
            {"detail": "Prédiction globale lancée en tâche de fond."},
            status=status.HTTP_202_ACCEPTED,
        )
