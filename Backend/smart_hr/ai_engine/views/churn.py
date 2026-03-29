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

# Chemin vers le modèle ML entraîné
MODEL_PATH = Path(__file__).resolve().parent.parent / "ml_models" / "churn_model.pkl"


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
    """Convertit un Employee en dictionnaire de features pour le modèle."""
    from django.utils import timezone

    tenure_years = 0
    if employee.hire_date:
        tenure_years = (timezone.now().date() - employee.hire_date).days / 365

    return {
        "salary": float(employee.salary),
        "tenure_years": round(tenure_years, 2),
        "status_active": 1 if employee.status == "active" else 0,
        "has_department": 1 if employee.department_id else 0,
        "has_position": 1 if employee.position_id else 0,
    }


class ChurnPredictionViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = ChurnPredictionSerializer
    permission_classes = [IsRH]

    def get_queryset(self):
        return ChurnPrediction.objects.select_related("employee__user").all()

    @action(detail=False, methods=["get"], url_path="high-risk")
    def high_risk(self, request):
        """Retourne uniquement les prédictions à risque ÉLEVÉ."""
        qs = ChurnPrediction.objects.filter(
            risk_level=ChurnPrediction.RiskLevel.HIGH
        ).select_related("employee__user")
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["post"], url_path=r"predict/(?P<employee_id>[^/.]+)")
    def predict(self, request, employee_id=None):
        """Lance une prédiction churn pour un employé donné."""
        try:
            employee = Employee.objects.select_related(
                "user", "department", "position"
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
            X = np.array([list(features.values())])
            proba = model.predict_proba(X)[0][1]
            risk_score = round(proba * 100, 2)

            if risk_score >= 70:
                risk_level = ChurnPrediction.RiskLevel.HIGH
            elif risk_score >= 40:
                risk_level = ChurnPrediction.RiskLevel.MEDIUM
            else:
                risk_level = ChurnPrediction.RiskLevel.LOW

            prediction = ChurnPrediction.objects.create(
                employee=employee,
                risk_score=risk_score,
                risk_level=risk_level,
                factors=list(features.keys()),
                recommendations=["Évaluer les conditions de travail"] if risk_score >= 70 else [],
            )
            # Mettre à jour le champ dénormalisé sur l'employé
            employee.churn_risk = risk_score
            employee.save(update_fields=["churn_risk"])

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
        """Lance la prédiction churn pour tous les employés actifs."""
        model = _load_model()
        if model is None:
            return Response(
                {"detail": "Le modèle de prédiction n'est pas encore entraîné."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        employees = Employee.objects.filter(status="active").select_related(
            "user", "department", "position"
        )
        results = []
        try:
            import numpy as np
            for employee in employees:
                features = _employee_to_features(employee)
                X = np.array([list(features.values())])
                proba = model.predict_proba(X)[0][1]
                risk_score = round(proba * 100, 2)

                if risk_score >= 70:
                    risk_level = ChurnPrediction.RiskLevel.HIGH
                elif risk_score >= 40:
                    risk_level = ChurnPrediction.RiskLevel.MEDIUM
                else:
                    risk_level = ChurnPrediction.RiskLevel.LOW

                prediction = ChurnPrediction.objects.create(
                    employee=employee,
                    risk_score=risk_score,
                    risk_level=risk_level,
                    factors=list(features.keys()),
                    recommendations=[],
                )
                employee.churn_risk = risk_score
                employee.save(update_fields=["churn_risk"])
                results.append(self.get_serializer(prediction).data)

            return Response({"count": len(results), "predictions": results})

        except Exception as exc:
            logger.error("Erreur lors de la prédiction globale : %s", exc)
            return Response(
                {"detail": "Erreur lors de la prédiction globale."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
