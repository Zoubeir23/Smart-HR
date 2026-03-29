from rest_framework import serializers

from smart_hr.document.models import Document


class DocumentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)

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
