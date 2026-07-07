from rest_framework import serializers

from smart_hr.ai_agents.models import VoiceMessage
from smart_hr.ai_agents.models import VoiceSession


class VoiceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceSession
        fields = ["id", "title", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class VoiceMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = VoiceMessage
        fields = ["id", "session", "question", "response", "audio_url", "voice", "created_at"]
        read_only_fields = ["id", "session", "question", "response", "audio_url", "voice", "created_at"]
