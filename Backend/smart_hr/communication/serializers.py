from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from smart_hr.communication.models import InternalMessage


class InternalMessageSerializer(serializers.ModelSerializer):
    message_type_display = serializers.CharField(source="get_message_type_display", read_only=True)
    target_audience_display = serializers.CharField(source="get_target_audience_display", read_only=True)
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = InternalMessage
        fields = [
            "id",
            "message_type",
            "message_type_display",
            "title",
            "content",
            "category",
            "target_audience",
            "target_audience_display",
            "author",
            "author_name",
            "is_published",
            "published_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "author", "created_at", "updated_at"]

    def get_author_name(self, obj: InternalMessage) -> str:
        if obj.author:
            return f"{obj.author.first_name} {obj.author.last_name}".strip() or obj.author.email
        return "—"

    def validate(self, attrs: dict) -> dict:
        is_published = attrs.get("is_published", getattr(self.instance, "is_published", False))
        published_at = attrs.get("published_at", getattr(self.instance, "published_at", None))

        if is_published and not published_at:
            attrs["published_at"] = timezone.now().date()

        return attrs
