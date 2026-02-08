from rest_framework import serializers

from .models import Document


class DocumentSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    uploaded_by_name = serializers.SerializerMethodField()
    document_type_display = serializers.CharField(
        source='get_document_type_display', read_only=True
    )

    class Meta:
        model = Document
        fields = [
            'id',
            'employee',
            'employee_name',
            'name',
            'document_type',
            'document_type_display',
            'file',
            'uploaded_by',
            'uploaded_by_name',
            'created_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at']

    def get_employee_name(self, obj):
        return obj.employee.user.get_full_name()

    def get_uploaded_by_name(self, obj):
        if obj.uploaded_by:
            return obj.uploaded_by.get_full_name()
        return None


class DocumentUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['employee', 'name', 'document_type', 'file']
