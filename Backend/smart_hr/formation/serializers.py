from __future__ import annotations

from rest_framework import serializers

from smart_hr.formation.models import Formation
from smart_hr.formation.models import Meeting
from smart_hr.formation.models import Participation


class MeetingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Meeting
        fields = "__all__"


class ParticipationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    employee_name = serializers.SerializerMethodField()
    formation_title = serializers.CharField(source="formation.title", read_only=True)

    class Meta:
        model = Participation
        fields = [
            "id",
            "employee",
            "employee_name",
            "formation",
            "formation_title",
            "status",
            "status_display",
            "enrolled_at",
            "completed_at",
            "notes",
        ]
        read_only_fields = ["id", "enrolled_at"]

    def get_employee_name(self, obj: Participation) -> str:
        user = obj.employee.user
        return f"{user.first_name} {user.last_name}".strip() or user.email


class FormationSerializer(serializers.ModelSerializer):
    meetings = MeetingSerializer(many=True, read_only=True)
    participants_count = serializers.SerializerMethodField()

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
            "participants_count",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_participants_count(self, obj: Formation) -> int:
        # .all() lit le prefetch cache si participations a été prefetch_related ;
        # évite N requêtes supplémentaires lors de la sérialisation d'une liste.
        if "participations" in getattr(obj, "_prefetched_objects_cache", {}):
            return len(obj.participations.all())
        return obj.participations.count()
