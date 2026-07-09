from rest_framework import serializers

from smart_hr.document.models import Document
from smart_hr.document.models import Signature
from smart_hr.document.models import SignatureRequest


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
            "category",
            "version",
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


class SignatureSerializer(serializers.ModelSerializer):
    class Meta:
        model = Signature
        fields = ["id", "image_data", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_image_data(self, value: str) -> str:
        if not value.startswith("data:image/"):
            raise serializers.ValidationError("La signature doit être une image encodée en data URL (data:image/...).")
        if len(value) > 2 * 1024 * 1024:
            raise serializers.ValidationError("Image de signature trop volumineuse.")
        return value


class SignatureRequestSerializer(serializers.ModelSerializer):
    document_name = serializers.CharField(source="document.name", read_only=True)
    signatory_name = serializers.CharField(source="signatory.get_full_name", read_only=True)
    requested_by_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = SignatureRequest
        fields = [
            "id",
            "document",
            "document_name",
            "requested_by",
            "requested_by_name",
            "signatory",
            "signatory_name",
            "status",
            "status_display",
            "signed_at",
            "comment",
            "created_at",
        ]
        read_only_fields = ["id", "requested_by", "status", "signed_at", "created_at"]

    def get_requested_by_name(self, obj: SignatureRequest) -> str:
        return obj.requested_by.get_full_name() if obj.requested_by else "—"
