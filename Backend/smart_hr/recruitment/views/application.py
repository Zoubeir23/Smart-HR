import logging

from django.conf import settings
from django.utils import timezone
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.core.email_service import send_application_received_email
from smart_hr.core.email_service import send_application_status_email
from smart_hr.core.email_service import send_interview_invitation_email
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.serializers import ApplicationSerializer
from smart_hr.recruitment.services.cv_analysis_service import analyze_cv_against_job_offer
from smart_hr.recruitment.services.cv_analysis_service import extract_text_from_pdf
from smart_hr.recruitment.services.cv_analysis_service import generate_interview_questions_from_cv
from smart_hr.users.permissions import IsCandidate
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class ApplicationViewSet(viewsets.ModelViewSet):
    """Gestion des candidatures avec analyse IA de CV et notifications email."""

    serializer_class = ApplicationSerializer

    def get_queryset(self):
        """Retourne toutes les candidatures pour RH/Admin, sinon celles du candidat.

        Paramètres query supportés (RH/Admin uniquement) :
        - min_score : float — filtre les candidatures avec matching_score >= min_score
        - job_offer : int   — filtre par offre d'emploi
        - status    : str   — filtre par statut
        """
        user = self.request.user
        if user.role in ["ADMIN", "RH"]:
            queryset = Application.objects.select_related("job_offer", "candidate").all()

            min_score = self.request.query_params.get("min_score")
            if min_score is not None:
                try:
                    queryset = queryset.filter(matching_score__gte=float(min_score))
                except ValueError:
                    raise ValidationError(
                        {"detail": "Le paramètre 'min_score' doit être un nombre décimal."},
                    )

            job_offer_id = self.request.query_params.get("job_offer")
            if job_offer_id:
                try:
                    queryset = queryset.filter(job_offer_id=int(job_offer_id))
                except ValueError:
                    raise ValidationError(
                        {"detail": "Le paramètre 'job_offer' doit être un entier."},
                    )

            application_status = self.request.query_params.get("status")
            if application_status:
                queryset = queryset.filter(status=application_status)

            return queryset

        return Application.objects.filter(candidate=user)

    def get_permissions(self):
        """Applique des permissions par action selon le rôle métier."""
        if self.action == "create":
            return [IsCandidate()]
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]

    def perform_create(self, serializer):
        """Crée une candidature, lance l'analyse CV (si consentement RGPD) puis notifie."""
        from rest_framework.exceptions import ValidationError

        if not serializer.validated_data.get("gdpr_consent", False):
            raise ValidationError(
                {"gdpr_consent": "Vous devez accepter le traitement de vos données par l'IA (RGPD)."},
            )

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
            application.save(
                update_fields=["matching_score", "skills_extracted", "ai_summary"],
            )

            logger.info(
                "Analyse CV terminée pour application %s — score : %.1f%%",
                application.pk,
                result["matching_score"],
            )
        except Exception:
            logger.exception(
                "Erreur lors de l'analyse CV pour application %s",
                application.pk,
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
                "Échec envoi confirmation candidature à %s",
                candidate.email,
            )

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une candidature et notifie le candidat par email."""
        application = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Application.Status.values:
            return Response(
                {
                    "detail": f"Statut invalide. Valeurs acceptées : {Application.Status.values}",
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = application.status
        application.status = new_status
        application.save(update_fields=["status", "updated_at"])

        if old_status != new_status and new_status not in {Application.Status.PENDING}:
            self._notify_candidate_status_update(application, new_status)

        serializer = self.get_serializer(application)
        return Response(serializer.data)

    def _notify_candidate_status_update(
        self,
        application: Application,
        new_status: str,
    ) -> None:
        """Informe le candidat d'un changement de statut de sa candidature."""
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

    @action(detail=True, methods=["post"], url_path="create-interview")
    def create_interview(self, request, pk=None):
        """
        POST /api/v1/recruitment/applications/{id}/create-interview/

        Génère des questions d'entretien personnalisées à partir du CV et de l'offre,
        crée une InterviewSession liée à la candidature, envoie le lien par email
        au candidat et met à jour le statut de la candidature en 'interview'.

        Paramètres body (optionnels) :
        - duration      : str  — ex. "30 Min", "45 Min" (défaut : "30 Min")
        - interview_type: str  — ex. "Technique", "RH" (défaut : "Technique")
        """
        from smart_hr.ai.models import InterviewSession

        application = self.get_object()
        job_offer = application.job_offer
        candidate = application.candidate

        duration = request.data.get("duration", "30 Min")
        interview_type = request.data.get("interview_type", "Technique")

        cv_text = ""
        try:
            cv_text = extract_text_from_pdf(application.cv)
        except Exception:
            logger.exception(
                "Impossible d'extraire le texte du CV pour la candidature %s",
                application.pk,
            )

        questions = generate_interview_questions_from_cv(
            cv_text=cv_text,
            skills_extracted=application.skills_extracted or [],
            ai_summary=application.ai_summary or "",
            job_title=job_offer.title,
            job_description=job_offer.description or "",
            job_requirements=job_offer.requirements or "",
            duration=duration,
            interview_type=interview_type,
        )

        interview_session = InterviewSession.objects.create(
            job_position=job_offer.title,
            job_description=job_offer.description or "",
            duration=duration,
            interview_type=interview_type,
            questions=questions,
            created_by=request.user,
            application=application,
        )

        site_url = getattr(settings, "SITE_URL", "http://localhost:3000")
        interview_link = f"{site_url}/interview/{interview_session.token}"

        email_sent = False
        try:
            email_sent = send_interview_invitation_email(
                candidate_email=candidate.email,
                first_name=candidate.first_name or "",
                job_title=job_offer.title,
                interview_link=interview_link,
                duration=duration,
                interview_type=interview_type,
            )
        except Exception:
            logger.exception(
                "Échec envoi email invitation entretien à %s",
                candidate.email,
            )

        application.status = Application.Status.INTERVIEW
        application.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "token": str(interview_session.token),
                "interview_link": interview_link,
                "questions_count": len(questions),
                "email_sent": email_sent,
            },
            status=status.HTTP_201_CREATED,
        )
