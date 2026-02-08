from django.contrib import admin

from .models import Document


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ['name', 'document_type', 'employee', 'uploaded_by', 'created_at']
    list_filter = ['document_type', 'created_at']
    search_fields = ['name', 'employee__user__first_name', 'employee__user__last_name']
    raw_id_fields = ['employee', 'uploaded_by']
