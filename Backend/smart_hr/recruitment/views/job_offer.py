from django.db.models import Count
from rest_framework import filters
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.recruitment.serializers import ApplicationSerializer
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
        base = JobOffer.objects.annotate(applications_count=Count("applications"))

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
        if self.action == "pipeline":
            return [IsRH()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Associe le créateur connecté à l'offre au moment de la création."""
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=["get"], url_path="pipeline", permission_classes=[IsRH])
    def pipeline(self, request, pk=None):
        """Vue Kanban des candidatures pour une offre, groupées par statut.

        Retourne un dict { statut: [candidatures] } pour chaque statut du pipeline.
        """
        job_offer = self.get_object()
        applications = (
            Application.objects.filter(job_offer=job_offer).select_related("candidate").order_by("-matching_score", "-created_at")
        )

        pipeline_columns = {status: [] for status, _ in Application.Status.choices}
        serializer = ApplicationSerializer(applications, many=True, context={"request": request})

        for application_data in serializer.data:
            status = application_data["status"]
            if status in pipeline_columns:
                pipeline_columns[status].append(application_data)

        return Response(
            {
                "job_offer_id": job_offer.pk,
                "job_offer_title": job_offer.title,
                "pipeline": pipeline_columns,
                "totals": {status: len(apps) for status, apps in pipeline_columns.items()},
            }
        )
