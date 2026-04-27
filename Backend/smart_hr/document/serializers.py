from rest_framework import serializers

from smart_hr.document.models import Document


class DocumentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )

    class Meta:
        model = Document
        fields = [
            "id",
            "employee",
            "employee_name",
            "name",
            "document_type",
            "file",
            "uploaded_by",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def validate_file(self, value):
        allowed_types = [
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ]
        if value.content_type not in allowed_types:
            raise serializers.ValidationError(
                "Format non autorisé. PDF, JPG, PNG ou Word uniquement.",
            )
        if value.size > 10 * 1024 * 1024:
            raise serializers.ValidationError("Le fichier ne doit pas dépasser 10 Mo.")
        return value
