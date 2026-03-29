from rest_framework import serializers

from smart_hr.ai.models import ChatHistory


class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = ["id", "user", "question", "response", "created_at"]
        read_only_fields = ["id", "user", "created_at"]
