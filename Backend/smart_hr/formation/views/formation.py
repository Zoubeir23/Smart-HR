from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated

from smart_hr.formation.models import Formation
from smart_hr.formation.serializers import FormationSerializer
from smart_hr.users.permissions import IsRH


class FormationViewSet(viewsets.ModelViewSet):
    """API CRUD des formations et de leurs réunions associées."""

    queryset = Formation.objects.prefetch_related("meetings").all()
    serializer_class = FormationSerializer

    def get_permissions(self):
        """Réserve l'écriture aux rôles RH/Admin et autorise la lecture authentifiée."""
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]
