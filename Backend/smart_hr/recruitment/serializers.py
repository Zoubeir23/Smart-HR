from rest_framework import serializers

from smart_hr.recruitment.models import Application
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
            "created_at",
        ]
        read_only_fields = [
            "candidate",
            "status",
            "matching_score",
            "skills_extracted",
            "ai_summary",
            "created_at",
        ]

    def validate_cv(self, value):
        if value.content_type != "application/pdf":
            raise serializers.ValidationError("Le CV doit être un fichier PDF.")
        if value.size > 5 * 1024 * 1024:
            raise serializers.ValidationError("Le CV ne doit pas dépasser 5 Mo.")
        return value
