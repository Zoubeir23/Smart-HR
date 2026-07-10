from __future__ import annotations

import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(name="smart_hr.ai_engine.tasks.predict_all_employees")
def predict_all_employees_task() -> dict:
    """Prédit le churn pour tous les employés actifs en tâche de fond.

    Déclenché via POST /api/v1/ai-engine/churn/predict-all/ (réponse 202).
    Évite le timeout HTTP sur les parcs > 100 employés.
    """
    import numpy as np

    from smart_hr.ai_engine.models import ChurnPrediction
    from smart_hr.ai_engine.views.churn import FEATURE_COLUMNS
    from smart_hr.ai_engine.views.churn import _build_employee_feature_maps
    from smart_hr.ai_engine.views.churn import _build_recommendations
    from smart_hr.ai_engine.views.churn import _employee_to_features
    from smart_hr.ai_engine.views.churn import _explain_prediction
    from smart_hr.ai_engine.views.churn import _load_model
    from smart_hr.personnel.models import Employee

    logger.info("Début de la prédiction churn globale")
    model = _load_model()
    if model is None:
        logger.error("Modèle churn introuvable — tâche annulée")
        return {"status": "error", "detail": "Modèle non entraîné"}

    employees = list(
        Employee.objects.filter(status=Employee.Status.ACTIVE).select_related("user", "department", "position")
    )
    employee_ids = [e.pk for e in employees]
    feature_maps = _build_employee_feature_maps(employee_ids)
    count = 0
    for employee in employees:
        try:
            features = _employee_to_features(employee, feature_maps=feature_maps)
            proba = model.predict_proba(np.array([[features[col] for col in FEATURE_COLUMNS]]))[0][1]
            risk_score = round(proba * 100, 2)
            risk_level = (
                ChurnPrediction.RiskLevel.HIGH
                if risk_score >= 70
                else ChurnPrediction.RiskLevel.MEDIUM
                if risk_score >= 40
                else ChurnPrediction.RiskLevel.LOW
            )
            main_feature_key, main_risk_factor, top_factors = _explain_prediction(model, features)
            recommendations = _build_recommendations(risk_score, main_feature_key)
            ChurnPrediction.objects.create(
                employee=employee,
                risk_score=risk_score,
                risk_level=risk_level,
                main_risk_factor=main_risk_factor,
                factors=top_factors,
                recommendations=recommendations,
            )
            Employee.objects.filter(pk=employee.pk).update(churn_risk=risk_score)
            count += 1
        except Exception:
            logger.exception("Erreur prédiction churn pour l'employé %s", employee.pk)

    logger.info("Prédiction churn globale terminée : %d employés traités", count)
    return {"status": "ok", "processed": count}


@shared_task(
    name="smart_hr.ai_engine.tasks.retrain_churn_model_task",
    autoretry_for=(Exception,),
    max_retries=3,
    retry_backoff=60,
    retry_backoff_max=300,
)
def retrain_churn_model_task() -> None:
    """Ré-entraîne le modèle Random Forest de prédiction churn.

    Planifié chaque lundi à 02h00 via CELERY_BEAT_SCHEDULE.
    Peut aussi être déclenché manuellement via l'API /api/v1/ai-engine/retrain/.
    Retente automatiquement jusqu'à 3 fois en cas d'échec (backoff 60s→300s).
    """
    logger.info("Début du ré-entraînement automatique du modèle churn")
    call_command("train_churn_model")
    logger.info("Ré-entraînement du modèle churn terminé avec succès")
