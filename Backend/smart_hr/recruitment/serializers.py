from rest_framework import serializers

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import ApplicationDocument
from smart_hr.recruitment.models import JobOffer


class JobOfferSerializer(serializers.ModelSerializer):
    applications_count = serializers.IntegerField(read_only=True)
    requirements_list = serializers.ListField(read_only=True)

    class Meta:
        model = JobOffer
        fields = [
            "id",
            "title",
            "department",
            "location",
            "job_type",
            "description",
            "requirements",
            "requirements_list",
            "salary_range",
            "status",
            "created_by",
            "created_at",
            "applications_count",
        ]
        read_only_fields = ["created_at", "created_by"]


class ApplicationSerializer(serializers.ModelSerializer):
    candidate_name = serializers.CharField(
        source="candidate.get_full_name",
        read_only=True,
    )
    job_title = serializers.CharField(source="job_offer.title", read_only=True)

    class Meta:
        model = Application
        fields = [
            "id",
            "job_offer",
            "job_title",
            "candidate",
            "candidate_name",
            "cv",
            "cover_letter",
            "status",
            "matching_score",
            "skills_extracted",
            "ai_summary",
            "gdpr_consent",
            "search_keywords",
            "onboarded",
            "created_at",
        ]
        read_only_fields = [
            "candidate",
            "status",
            "matching_score",
            "skills_extracted",
            "ai_summary",
            "onboarded",
            "created_at",
        ]

    def validate_gdpr_consent(self, value: bool) -> bool:
        if not value:
            raise serializers.ValidationError(
                "Vous devez accepter le traitement de vos données personnelles (RGPD).",
            )
        return value

    def validate_cv(self, value):
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Le CV ne doit pas dépasser 5 Mo.")

        # Validation du type via libmagic (analyse du contenu) si la bibliothèque
        # système est disponible. Sinon, repli sur l'extension et le content_type
        # déclaré — libmagic n'est pas installé par défaut sur tous les OS et son
        # absence ne doit pas provoquer une erreur 500 lors de l'envoi du CV.
        try:
            import magic

            value.seek(0)
            mime = magic.from_buffer(value.read(2048), mime=True)
            value.seek(0)
        except ImportError:
            declared = getattr(value, "content_type", None)
            name = (getattr(value, "name", "") or "").lower()
            if declared == "application/pdf" or name.endswith(".pdf"):
                return value
            raise serializers.ValidationError(
                "Le CV doit être un fichier PDF valide.",
            ) from None

        if mime != "application/pdf":
            raise serializers.ValidationError("Le CV doit être un fichier PDF valide.")
        return value


class ApplicationDocumentSerializer(serializers.ModelSerializer):
    document_type_display = serializers.CharField(
        source="get_document_type_display",
        read_only=True,
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationDocument
        fields = [
            "id",
            "application",
            "document_type",
            "document_type_display",
            "label",
            "file",
            "file_url",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_file_url(self, obj: ApplicationDocument) -> str | None:
        request = self.context.get("request")
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None
