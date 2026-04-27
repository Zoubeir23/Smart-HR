from rest_framework import serializers

from smart_hr.formation.models import Formation
from smart_hr.formation.models import Meeting


class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = "__all__"


class FormationSerializer(serializers.ModelSerializer):
    meetings = MeetingSerializer(many=True, read_only=True)

    class Meta:
        model = Formation
        fields = [
            "id",
            "title",
            "description",
            "start_date",
            "end_date",
            "instructor",
            "meetings",
            "created_at",
        ]
        read_only_fields = ["created_at"]
