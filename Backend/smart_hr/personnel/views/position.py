from rest_framework import viewsets

from smart_hr.personnel.models import Position
from smart_hr.personnel.serializers import PositionSerializer
from smart_hr.users.permissions import IsRH


class PositionViewSet(viewsets.ModelViewSet):
    queryset = Position.objects.select_related("department").all()
    serializer_class = PositionSerializer
    permission_classes = [IsRH]
