from __future__ import annotations

import logging

from celery import shared_task
from django.core.management import call_command

logger = logging.getLogger(__name__)


@shared_task(name="smart_hr.ai_engine.tasks.retrain_churn_model")
def retrain_churn_model_task() -> None:
    """Ré-entraîne le modèle Random Forest de prédiction churn.

    Planifié chaque lundi à 02h00 via CELERY_BEAT_SCHEDULE.
    Peut aussi être déclenché manuellement via l'API /api/v1/ai-engine/retrain/.
    """
    logger.info("Début du ré-entraînement automatique du modèle churn")
    try:
        call_command("train_churn_model")
        logger.info("Ré-entraînement du modèle churn terminé avec succès")
    except Exception:
        logger.exception("Échec du ré-entraînement du modèle churn")
        raise
