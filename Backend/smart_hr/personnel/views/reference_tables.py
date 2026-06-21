from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.personnel.models import DepartureReason
from smart_hr.personnel.models import Diploma
from smart_hr.personnel.models import FamilyStatus
from smart_hr.personnel.models import Nationality
from smart_hr.personnel.serializers import DepartureReasonSerializer
from smart_hr.personnel.serializers import DiplomaSerializer
from smart_hr.personnel.serializers import FamilyStatusSerializer
from smart_hr.personnel.serializers import NationalitySerializer
from smart_hr.users.permissions import IsRH


class _ReferenceTableViewSet(viewsets.ModelViewSet):
    """Base commune aux tables de référence : lecture publique, écriture réservée RH."""

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [IsAuthenticated()]
        return [IsRH()]


class NationalityViewSet(_ReferenceTableViewSet):
    queryset = Nationality.objects.all()
    serializer_class = NationalitySerializer


class FamilyStatusViewSet(_ReferenceTableViewSet):
    queryset = FamilyStatus.objects.all()
    serializer_class = FamilyStatusSerializer


class DiplomaViewSet(_ReferenceTableViewSet):
    queryset = Diploma.objects.all()
    serializer_class = DiplomaSerializer


class DepartureReasonViewSet(_ReferenceTableViewSet):
    queryset = DepartureReason.objects.all()
    serializer_class = DepartureReasonSerializer
