from django.contrib import admin

from smart_hr.communication.models import InternalMessage


@admin.register(InternalMessage)
class InternalMessageAdmin(admin.ModelAdmin):
    list_display = ["title", "message_type", "target_audience", "is_published", "published_at", "author", "created_at"]
    list_filter = ["message_type", "target_audience", "is_published"]
    search_fields = ["title", "content", "category"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"
    autocomplete_fields = []

    fieldsets = [
        (
            "Contenu",
            {
                "fields": [
                    "message_type",
                    "title",
                    "content",
                    "category",
                ]
            },
        ),
        (
            "Diffusion",
            {
                "fields": [
                    "target_audience",
                    "author",
                    "is_published",
                    "published_at",
                ]
            },
        ),
        (
            "Métadonnées",
            {
                "fields": ["created_at", "updated_at"],
                "classes": ["collapse"],
            },
        ),
    ]
