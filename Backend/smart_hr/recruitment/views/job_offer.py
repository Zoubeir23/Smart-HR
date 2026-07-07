import json
import logging

from django.db.models import Count
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.ai.llm_providers import get_llm_provider
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.recruitment.serializers import ApplicationSerializer
from smart_hr.recruitment.serializers import JobOfferSerializer
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

_JOB_TYPE_VALUES = [choice[0] for choice in JobOffer.JobType.choices]

_GENERATE_PROMPT = """Tu es un rédacteur RH expert. À partir de la fiche de poste brute
fournie par le recruteur, génère une offre d'emploi structurée et professionnelle en français.

Fiche de poste fournie par le recruteur :
---
{job_description}
---

Réponds UNIQUEMENT avec un objet JSON (pas de texte autour), avec exactement ces clés :
- "title" : intitulé du poste, concis et attractif
- "department" : nom du département/service concerné
- "location" : lieu de travail (déduis-le du texte, ou "À définir" si absent)
- "job_type" : une valeur parmi {job_type_values}
- "description" : description complète et engageante du poste (plusieurs phrases)
- "requirements" : liste des prérequis, un par ligne (séparés par \\n)
- "salary_range" : fourchette salariale si mentionnée, sinon chaîne vide
"""


def _parse_llm_json(raw: str) -> dict:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    return json.loads(raw)


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
        base = JobOffer.objects.annotate(applications_count=Count("applications")).order_by("-created_at")

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
        if self.action in ["pipeline", "generate"]:
            return [IsRH()]
        if self.action in ["create", "update", "partial_update", "destroy"]:
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        """Associe le créateur connecté à l'offre au moment de la création."""
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=["post"], url_path="generate", permission_classes=[IsRH])
    def generate(self, request):
        """
        POST /api/v1/recruitment/job-offers/generate/
        Body: { "job_description": "texte brut de la fiche de poste" }
        Génère un brouillon d'offre d'emploi structuré via IA — non persisté,
        le recruteur complète/édite avant de publier via POST /job-offers/.
        """
        job_description = (request.data.get("job_description") or "").strip()
        if not job_description:
            return Response(
                {"detail": "Le champ 'job_description' est requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        prompt = _GENERATE_PROMPT.format(
            job_description=job_description,
            job_type_values=", ".join(_JOB_TYPE_VALUES),
        )

        try:
            provider = get_llm_provider()
            raw = provider.extract_json(prompt)
            draft = _parse_llm_json(raw)
        except Exception:
            logger.exception("Erreur génération offre d'emploi par IA")
            return Response(
                {"detail": "Erreur lors de la génération de l'offre. Réessayez."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if draft.get("job_type") not in _JOB_TYPE_VALUES:
            draft["job_type"] = JobOffer.JobType.FULL_TIME

        return Response(draft, status=status.HTTP_200_OK)

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
