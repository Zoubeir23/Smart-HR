from rest_framework import serializers

from .models import Formation, Meeting


class MeetingSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = Meeting
        fields = [
            'id',
            'formation',
            'title',
            'start_time',
            'end_time',
            'meeting_link',
            'status',
            'status_display',
        ]


class FormationSerializer(serializers.ModelSerializer):
    meetings = MeetingSerializer(many=True, read_only=True)

    class Meta:
        model = Formation
        fields = [
            'id',
            'title',
            'description',
            'start_date',
            'end_date',
            'instructor',
            'created_at',
            'meetings',
        ]
        read_only_fields = ['id', 'created_at']
