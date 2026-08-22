import logging

from django.conf import settings
from django.db import transaction
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
from smart_hr.recruitment.serializers import CandidateApplicationSerializer
from smart_hr.recruitment.services.cv_analysis_service import extract_text_from_pdf
from smart_hr.recruitment.services.cv_analysis_service import generate_interview_questions_from_cv
from smart_hr.recruitment.tasks import analyze_cv_async
from smart_hr.users.permissions import IsCandidate
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class ApplicationViewSet(viewsets.ModelViewSet):
    """Gestion des candidatures avec analyse IA de CV et notifications email."""

    serializer_class = ApplicationSerializer

    def get_serializer_class(self):
        """Masque internal_note aux candidats — seuls RH/Admin ont le serializer complet."""
        if self.request.user.role in ["ADMIN", "RH"]:
            return ApplicationSerializer
        return CandidateApplicationSerializer

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
                except ValueError as exc:
                    raise ValidationError(
                        {"detail": "Le paramètre 'min_score' doit être un nombre décimal."},
                    ) from exc

            job_offer_id = self.request.query_params.get("job_offer")
            if job_offer_id:
                try:
                    queryset = queryset.filter(job_offer_id=int(job_offer_id))
                except ValueError as exc:
                    raise ValidationError(
                        {"detail": "Le paramètre 'job_offer' doit être un entier."},
                    ) from exc

            application_status = self.request.query_params.get("status")
            if application_status:
                queryset = queryset.filter(status=application_status)

            return queryset

        return Application.objects.filter(candidate=user)

    def get_permissions(self):
        """Applique des permissions par action selon le rôle métier.

        Une action déclarée via @action(..., permission_classes=[...]) est
        prioritaire sur la règle par défaut ci-dessous : sans cette lecture
        explicite, ce paramètre est silencieusement ignoré (get_permissions
        ne retombe jamais sur le comportement par défaut de DRF qui le lit
        depuis self.permission_classes), ce qui peut donner l'illusion
        qu'une action est restreinte alors qu'elle ne l'est pas.
        """
        action_method = getattr(self, self.action, None)
        action_permission_classes = getattr(action_method, "kwargs", {}).get("permission_classes")
        if action_permission_classes:
            return [permission() for permission in action_permission_classes]
        if self.action == "create":
            return [IsCandidate()]
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]

    def perform_create(self, serializer):
        """Crée une candidature, lance l'analyse CV (si consentement RGPD) puis notifie."""
        if not serializer.validated_data.get("gdpr_consent", False):
            raise ValidationError(
                {"gdpr_consent": "Vous devez accepter le traitement de vos données par l'IA (RGPD)."},
            )

        application = serializer.save(candidate=self.request.user)
        transaction.on_commit(lambda: analyze_cv_async.delay(application.pk))
        self._notify_candidate_application_received(application)

    @action(detail=True, methods=["post"], url_path="analyze-cv")
    def analyze_cv(self, request, pk=None):
        """
        POST /api/v1/recruitment/applications/{id}/analyze-cv/
        Relance l'analyse IA du CV en arrière-plan (Celery) pour une candidature existante (RH uniquement).
        """
        application = self.get_object()
        analyze_cv_async.delay(application.pk)
        return Response(
            {"detail": "Analyse CV lancée en arrière-plan.", "application_id": application.pk},
            status=status.HTTP_202_ACCEPTED,
        )

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

    @staticmethod
    def _check_onboard_preconditions(application) -> str | None:
        """Retourne un message d'erreur si l'onboarding est impossible, None sinon."""
        if application.status != Application.Status.ACCEPTED:
            return "Seules les candidatures acceptées peuvent être onboardées."
        if application.onboarded:
            return "Ce candidat a déjà été transformé en employé."
        if hasattr(application.candidate, "employee_profile"):
            return "Un profil employé existe déjà pour cet utilisateur."
        return None

    @action(detail=True, methods=["post"], url_path="onboard", permission_classes=[IsRH])
    def onboard(self, request, pk=None):
        """
        POST /api/v1/recruitment/applications/{id}/onboard/

        Transforme un candidat accepté en employé actif.
        Champs requis dans le body : department_id, position_id, salary.
        """
        from django.utils import timezone

        from smart_hr.personnel.models import Department
        from smart_hr.personnel.models import Employee
        from smart_hr.personnel.models import Position

        application = self.get_object()

        precondition_error = self._check_onboard_preconditions(application)
        if precondition_error is not None:
            return Response({"detail": precondition_error}, status=status.HTTP_400_BAD_REQUEST)

        candidate_user = application.candidate

        department_id = request.data.get("department_id")
        position_id = request.data.get("position_id")
        salary_raw = request.data.get("salary")

        if not department_id or not position_id or salary_raw is None:
            return Response(
                {"detail": "Les champs department_id, position_id et salary sont obligatoires."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            department = Department.objects.get(id=department_id)
        except Department.DoesNotExist:
            return Response({"detail": "Département introuvable."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            position = Position.objects.get(id=position_id)
        except Position.DoesNotExist:
            return Response({"detail": "Poste introuvable."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            salary = float(salary_raw)
        except (ValueError, TypeError):
            salary = -1
        if salary < 0:
            return Response({"detail": "Le salaire doit être un nombre positif."}, status=status.HTTP_400_BAD_REQUEST)

        Employee.objects.create(
            user=candidate_user,
            hire_date=timezone.now().date(),
            status=Employee.Status.ACTIVE,
            department=department,
            position=position,
            salary=salary,
        )

        candidate_user.role = candidate_user.Role.EMPLOYEE
        candidate_user.save(update_fields=["role"])

        application.onboarded = True
        application.save(update_fields=["onboarded", "updated_at"])

        logger.info(
            "Onboarding effectué : candidature %s → employé %s",
            application.pk,
            candidate_user.pk,
        )

        serializer = self.get_serializer(application)
        return Response(
            {
                "detail": f"{candidate_user.get_full_name() or candidate_user.email} a été intégré comme employé.",
                "application": serializer.data,
            },
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["post"], url_path="anonymize")
    def anonymize(self, request, pk=None):
        """
        POST /api/v1/recruitment/applications/{id}/anonymize/
        RGPD droit à l'oubli : anonymise les données personnelles d'une candidature
        rejetée ou refusée. Seuls le statut et le score sont conservés (statistiques).
        Réservé aux Admin/RH.
        """
        from smart_hr.core.models import log_audit_action

        application = self.get_object()

        if application.status not in {Application.Status.REJECTED, Application.Status.WITHDRAWN}:
            return Response(
                {"detail": "Seules les candidatures rejetées ou retirées peuvent être anonymisées."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.anonymized:
            return Response(
                {"detail": "Cette candidature a déjà été anonymisée."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if application.cv:
            try:
                application.cv.delete(save=False)
            except Exception:
                logger.exception("Impossible de supprimer le CV pour la candidature %s", application.pk)

        application.ai_summary = "[données anonymisées - RGPD]"
        application.skills_extracted = []
        application.cover_letter = ""
        application.anonymized = True
        application.save(
            update_fields=["cv", "ai_summary", "skills_extracted", "cover_letter", "anonymized", "updated_at"],
        )

        log_audit_action(
            performed_by=request.user,
            action="DELETE",
            model_name="Application",
            object_id=str(application.pk),
            object_repr=f"Candidature #{application.pk} — {application.job_offer.title}",
            details={"raison": "Anonymisation RGPD", "status": application.status},
        )

        logger.info("Candidature %s anonymisée (RGPD) par %s", application.pk, request.user.email)

        return Response(
            {"detail": "Candidature anonymisée avec succès.", "id": application.pk},
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["patch"], url_path="add-note", permission_classes=[IsRH])
    def add_note(self, request, pk=None):
        """Ajoute ou met à jour la note interne RH sur une candidature (jamais visible par le candidat).

        Body : { "internal_note": "..." }
        """
        application = self.get_object()
        note = request.data.get("internal_note", "")
        application.internal_note = note
        application.save(update_fields=["internal_note", "updated_at"])
        return Response(
            {"id": application.pk, "internal_note": application.internal_note},
            status=status.HTTP_200_OK,
        )
