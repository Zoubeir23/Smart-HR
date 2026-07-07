from rest_framework import serializers

from smart_hr.ai.models import ChatHistory
from smart_hr.ai.models import Conversation


class ChatHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatHistory
        fields = ["id", "conversation", "user", "question", "response", "action_type", "action_data", "created_at"]
        read_only_fields = ["id", "conversation", "user", "action_type", "action_data", "created_at"]


class ConversationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Conversation
        fields = ["id", "title", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]
