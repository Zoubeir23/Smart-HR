import logging

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)


class AccountDeleteView(APIView):
    """
    DELETE /api/v1/auth/account/delete/
    Droit à l'oubli RGPD : supprime le compte de l'utilisateur connecté.
    Les données associées (candidatures, historique chat) sont supprimées
    en cascade via les FK Django.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        user = request.user
        email = user.email
        user.delete()
        logger.info("Compte supprimé (RGPD) : %s", email)
        return Response(
            {"detail": "Votre compte et toutes vos données ont été supprimés."},
            status=status.HTTP_204_NO_CONTENT,
        )


class PersonalDataExportView(APIView):
    """
    GET /api/v1/auth/account/export/
    Droit à la portabilité RGPD : exporte toutes les données personnelles.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        data: dict = {
            "compte": {
                "email": user.email,
                "prenom": user.first_name,
                "nom": user.last_name,
                "telephone": user.tel,
                "role": user.role,
                "date_inscription": user.date_joined.isoformat(),
                "email_verifie": user.is_email_verified,
            },
            "candidatures": [],
            "conversations_ia": [],
        }

        try:
            from smart_hr.recruitment.models import Application

            for application in Application.objects.filter(candidate=user).select_related("job_offer"):
                data["candidatures"].append(
                    {
                        "poste": application.job_offer.title,
                        "departement": application.job_offer.department,
                        "statut": application.get_status_display(),
                        "score_matching": application.matching_score,
                        "competences_extraites": application.skills_extracted,
                        "resume_ia": application.ai_summary,
                        "date_candidature": application.created_at.isoformat(),
                    },
                )
        except Exception:
            logger.exception("Erreur export candidatures pour %s", user.email)

        try:
            from smart_hr.ai.models import ChatHistory

            for chat in ChatHistory.objects.filter(user=user):
                data["conversations_ia"].append(
                    {
                        "question": chat.question,
                        "reponse": chat.response,
                        "date": chat.created_at.isoformat(),
                    },
                )
        except Exception:
            logger.exception("Erreur export historique chat pour %s", user.email)

        return Response(data)
