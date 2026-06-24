from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated

from smart_hr.recruitment.models import JobOffer
from smart_hr.recruitment.serializers import JobOfferSerializer
from smart_hr.users.permissions import IsRH


class JobOfferViewSet(viewsets.ModelViewSet):
    """API des offres d'emploi.

    Règles de visibilité :
    - RH/Admin : toutes les offres (ouvertes et fermées, internes et externes)
    - Employé (authentifié, rôle EMPLOYEE) : offres ouvertes uniquement (internes + externes)
    - Candidat (authentifié, rôle CANDIDATE) : offres ouvertes non-internes uniquement
    - Non authentifié : offres ouvertes non-internes (pour page de carrières publique)
    """

    serializer_class = JobOfferSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "department", "description"]

    def get_queryset(self):
        user = self.request.user
        base = JobOffer.objects.all()

        if not user.is_authenticated:
            return base.filter(status=JobOffer.Status.OPEN, is_internal=False)

        if user.role in ["ADMIN", "RH"]:
            return base

        if user.role == "EMPLOYEE":
            return base.filter(status=JobOffer.Status.OPEN)

        return base.filter(status=JobOffer.Status.OPEN, is_internal=False)

    def get_permissions(self):
        """Autorise la consultation publique et protège les actions d'édition."""
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Associe le créateur connecté à l'offre au moment de la création."""
        serializer.save(created_by=self.request.user)
