from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.formation.models import Meeting
from smart_hr.formation.serializers import MeetingSerializer
from smart_hr.users.permissions import IsRH


class MeetingViewSet(viewsets.ModelViewSet):
    queryset = Meeting.objects.select_related("formation").all()
    serializer_class = MeetingSerializer

    def get_permissions(self):
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
