import json
import logging
import os

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
from smart_hr.recruitment.services.bulk_cv_upload import upload_cvs_to_job_offer
from smart_hr.recruitment.services.cv_analysis_service import _sanitize_user_content
from smart_hr.recruitment.services.document_text_extraction import SUPPORTED_DOCUMENT_EXTENSIONS
from smart_hr.recruitment.services.document_text_extraction import extract_text_from_uploaded_document
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)

_JOB_TYPE_VALUES = [choice[0] for choice in JobOffer.JobType.choices]
_MAX_GENERATE_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 Mo

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
        if self.action in ["pipeline", "generate", "bulk_upload_cvs"]:
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
        Body (JSON ou multipart) : { "job_description": "texte brut" } et/ou
        { "file": <PDF|TXT|MD> }. Le texte de description et le contenu du
        fichier joint (fiche de poste) sont combinés avant génération.
        Génère un brouillon d'offre d'emploi structuré via IA — non persisté,
        le recruteur complète/édite avant de publier via POST /job-offers/.
        """
        job_description = (request.data.get("job_description") or "").strip()
        uploaded_file = request.FILES.get("file")

        file_text = ""
        if uploaded_file is not None:
            extension = os.path.splitext(uploaded_file.name)[1].lower()
            if extension not in SUPPORTED_DOCUMENT_EXTENSIONS:
                return Response(
                    {
                        "detail": (
                            f"Extension «{extension}» non supportée. "
                            f"Formats acceptés : {', '.join(sorted(SUPPORTED_DOCUMENT_EXTENSIONS))}."
                        )
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if uploaded_file.size > _MAX_GENERATE_FILE_SIZE_BYTES:
                return Response(
                    {"detail": "Fichier trop volumineux. Maximum autorisé : 10 Mo."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            file_text = extract_text_from_uploaded_document(uploaded_file)

        combined_description = "\n\n".join(part for part in [job_description, file_text] if part)
        if not combined_description:
            return Response(
                {"detail": "Fournissez une description ('job_description') et/ou un fichier ('file')."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        safe_description = _sanitize_user_content(combined_description, max_length=6000)
        prompt = _GENERATE_PROMPT.format(
            job_description=safe_description,
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

    @action(detail=True, methods=["post"], url_path="bulk-upload-cvs", permission_classes=[IsRH])
    def bulk_upload_cvs(self, request, pk=None):
        """
        POST /api/v1/recruitment/job-offers/{id}/bulk-upload-cvs/
        Body (multipart) : cvs=<fichier1>, cvs=<fichier2>, ...

        Pour chaque CV : extraction du texte, identification du candidat et scoring
        par rapport à l'offre via IA, puis création du compte candidat (s'il n'existe
        pas déjà) et de sa candidature. Un fichier en échec n'interrompt pas le lot.
        """
        job_offer = self.get_object()
        files = request.FILES.getlist("cvs")
        if not files:
            return Response({"detail": "Au moins un fichier CV est requis (champ 'cvs')."}, status=status.HTTP_400_BAD_REQUEST)

        result = upload_cvs_to_job_offer(job_offer, files, created_by=request.user)
        return Response(result.as_dict(), status=status.HTTP_200_OK)
