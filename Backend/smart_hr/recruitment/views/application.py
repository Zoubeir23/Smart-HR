import logging

from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings

from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.serializers import ApplicationSerializer
from smart_hr.users.permissions import IsCandidate
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

_STATUS_SUBJECTS = {
    Application.Status.ACCEPTED: "Félicitations — Votre candidature a été acceptée",
    Application.Status.REJECTED: "Résultat de votre candidature",
    Application.Status.INTERVIEW: "Invitation à un entretien",
}

_STATUS_MESSAGES = {
    Application.Status.ACCEPTED: (
        "Nous avons le plaisir de vous informer que votre candidature a été retenue. "
        "Notre équipe RH vous contactera prochainement pour les prochaines étapes."
    ),
    Application.Status.REJECTED: (
        "Après examen attentif de votre candidature, nous ne sommes pas en mesure "
        "de donner suite à votre dossier. Nous vous remercions de l'intérêt porté à notre entreprise."
    ),
    Application.Status.INTERVIEW: (
        "Votre profil a retenu notre attention. Nous souhaitons vous rencontrer "
        "pour un entretien. Notre équipe RH vous contactera pour convenir d'un rendez-vous."
    ),
}


def _notify_candidate(application: Application) -> None:
    """Envoie un email au candidat si le statut mérite une notification."""
    subject = _STATUS_SUBJECTS.get(application.status)
    if not subject:
        return

    candidate_email = application.candidate.email
    if not candidate_email:
        return

    body = (
        f"Bonjour {application.candidate.get_full_name() or application.candidate.username},\n\n"
        f"{_STATUS_MESSAGES[application.status]}\n\n"
        f"Poste : {application.job_offer.title}\n\n"
        "Cordialement,\nL'équipe Smart-HR"
    )

    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[candidate_email],
            fail_silently=False,
        )
    except Exception as exc:
        logger.warning("Impossible d'envoyer l'email au candidat %s : %s", candidate_email, exc)


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
        serializer.save(candidate=self.request.user)

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une candidature et notifie le candidat par email."""
        application = self.get_object()
        new_status = request.data.get("status")
        if new_status not in Application.Status.values:
            return Response(
                {"detail": f"Statut invalide. Valeurs acceptées : {Application.Status.values}"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        application.status = new_status
        application.save(update_fields=["status", "updated_at"])
        _notify_candidate(application)
        serializer = self.get_serializer(application)
        return Response(serializer.data)
