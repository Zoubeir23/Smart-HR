import logging

from django.utils import timezone
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.core.email_service import send_application_received_email
from smart_hr.core.email_service import send_application_status_email
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.serializers import ApplicationSerializer
from smart_hr.recruitment.services.cv_analysis_service import (
    analyze_cv_against_job_offer,
    extract_text_from_pdf,
)
from smart_hr.users.permissions import IsCandidate
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            return Application.objects.select_related("job_offer", "candidate").all()
        return Application.objects.filter(candidate=user)

    def get_permissions(self):
        if self.action == "create":
            return [IsCandidate()]
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]

    def perform_create(self, serializer):
        application = serializer.save(candidate=self.request.user)
        self._run_cv_analysis(application)
        self._notify_candidate_application_received(application)

    # ─── Analyse NLP ─────────────────────────────────────────────────────────

    def _run_cv_analysis(self, application: Application) -> None:
        """Analyse le CV par IA et met à jour matching_score, skills_extracted, ai_summary."""
        try:
            job_offer = application.job_offer
            cv_text = extract_text_from_pdf(application.cv)

            result = analyze_cv_against_job_offer(
                cv_text=cv_text,
                cover_letter=application.cover_letter or "",
                job_title=job_offer.title,
                job_requirements=job_offer.requirements or "",
                job_description=job_offer.description or "",
            )

            application.matching_score = result["matching_score"]
            application.skills_extracted = result["skills_extracted"]
            application.ai_summary = result["ai_summary"]
            application.save(update_fields=["matching_score", "skills_extracted", "ai_summary"])

            logger.info(
                "Analyse CV terminée pour application %s — score : %.1f%%",
                application.pk,
                result["matching_score"],
            )
        except Exception:
            logger.exception(
                "Erreur lors de l'analyse CV pour application %s", application.pk
            )

    @action(detail=True, methods=["post"], url_path="analyze-cv")
    def analyze_cv(self, request, pk=None):
        """
        POST /api/v1/recruitment/applications/{id}/analyze-cv/
        Relance l'analyse IA du CV pour une candidature existante (RH uniquement).
        """
        application = self.get_object()
        self._run_cv_analysis(application)
        serializer = self.get_serializer(application)
        return Response(serializer.data)

    # ─── Notifications ───────────────────────────────────────────────────────

    def _notify_candidate_application_received(self, application: Application) -> None:
        candidate = application.candidate
        try:
            send_application_received_email(
                candidate_email=candidate.email,
                first_name=candidate.first_name or "",
                job_title=application.job_offer.title,
                department=application.job_offer.department,
                applied_on=timezone.now().strftime("%d/%m/%Y"),
            )
        except Exception:
            logger.exception(
                "Échec envoi confirmation candidature à %s", candidate.email
            )

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une candidature (RH seulement)."""
        application = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Application.Status.values:
            return Response(
                {"detail": f"Statut invalide. Valeurs acceptées : {Application.Status.values}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = application.status
        application.status = new_status
        application.save(update_fields=["status", "updated_at"])

        if old_status != new_status and new_status != Application.Status.PENDING:
            self._notify_candidate_status_update(application, new_status)

        serializer = self.get_serializer(application)
        return Response(serializer.data)

    def _notify_candidate_status_update(self, application: Application, new_status: str) -> None:
        candidate = application.candidate
        try:
            send_application_status_email(
                candidate_email=candidate.email,
                first_name=candidate.first_name or "",
                job_title=application.job_offer.title,
                new_status=new_status,
            )
        except Exception:
            logger.exception(
                "Échec envoi email statut candidature (%s) à %s",
                new_status,
                candidate.email,
            )
