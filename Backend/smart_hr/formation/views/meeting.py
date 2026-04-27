import logging

from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.core.email_service import send_meeting_invitation_email
from smart_hr.formation.models import Meeting
from smart_hr.formation.serializers import MeetingSerializer
from smart_hr.personnel.models import Employee
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class MeetingViewSet(viewsets.ModelViewSet):
    """Gestion des réunions de formation et diffusion des invitations."""

    queryset = Meeting.objects.select_related("formation").all()
    serializer_class = MeetingSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Crée la réunion puis envoie les invitations aux employés actifs."""
        meeting = serializer.save()
        self._send_invitations_to_all_employees(meeting)

    def _send_invitations_to_all_employees(self, meeting: Meeting) -> None:
        """Envoie une invitation à tous les employés actifs."""
        active_employees = (
            Employee.objects.select_related("user")
            .filter(
                status="active",
                user__email__isnull=False,
            )
            .exclude(user__email="")
        )

        employee_emails = [e.user.email for e in active_employees]
        if not employee_emails:
            return

        start_time_str = meeting.start_time.strftime("%d/%m/%Y à %H:%M")
        end_time_str = meeting.end_time.strftime("%d/%m/%Y à %H:%M")

        try:
            send_meeting_invitation_email(
                employee_emails=employee_emails,
                first_name="l'équipe",
                meeting_title=meeting.title,
                formation_title=meeting.formation.title,
                start_time=start_time_str,
                end_time=end_time_str,
                meeting_link=meeting.meeting_link or "",
            )
        except Exception:
            logger.exception(
                "Échec envoi invitations pour la réunion '%s'",
                meeting.title,
            )
