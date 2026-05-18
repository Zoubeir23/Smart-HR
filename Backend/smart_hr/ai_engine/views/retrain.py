from __future__ import annotations

import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class RetriggerChurnModelView(APIView):
    """
    POST /api/v1/ai-engine/retrain/
    Déclenche manuellement le ré-entraînement du modèle churn via Celery (RH/Admin uniquement).
    """

    permission_classes = [IsRH]

    def post(self, request) -> Response:
        try:
            from smart_hr.ai_engine.tasks import retrain_churn_model_task

            retrain_churn_model_task.delay()
            return Response(
                {"detail": "Ré-entraînement du modèle lancé en tâche de fond."},
                status=status.HTTP_202_ACCEPTED,
            )
        except Exception:
            logger.exception("Échec du déclenchement de la tâche de ré-entraînement churn")
            return Response(
                {"detail": "Impossible de lancer le ré-entraînement. Vérifiez que Celery est actif."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
