from rest_framework import serializers

from smart_hr.presence.models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    """Serializer complet pour une entrée de présence."""

    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="employee.department.name",
        read_only=True,
        default="",
    )
    duration_hours = serializers.SerializerMethodField()

    absence_type_display = serializers.CharField(
        source="get_absence_type_display",
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = Attendance
        fields = [
            "id",
            "employee",
            "employee_name",
            "department_name",
            "date",
            "check_in",
            "check_out",
            "duration_hours",
            "status",
            "absence_type",
            "absence_type_display",
            "note",
            "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_duration_hours(self, obj: Attendance) -> float | None:
        """Calcule la durée en heures entre check_in et check_out."""
        if obj.check_in and obj.check_out:
            from datetime import date
            from datetime import datetime

            base = date.today()
            start = datetime.combine(base, obj.check_in)
            end = datetime.combine(base, obj.check_out)
            diff = end - start
            if diff.total_seconds() > 0:
                return round(diff.total_seconds() / 3600, 2)
        return None

    def validate(self, attrs):
        """Vérifie cohérence check_out > check_in et absence_type renseigné si absent."""
        check_in = attrs.get("check_in")
        check_out = attrs.get("check_out")
        if check_in and check_out and check_out <= check_in:
            raise serializers.ValidationError(
                {"check_out": "L'heure de sortie doit être après l'heure d'arrivée."},
            )

        # Pour les PATCH partiels, on consulte l'instance existante si le champ est absent
        instance_status = getattr(self.instance, "status", None)
        att_status = attrs.get("status", instance_status)
        instance_absence = getattr(self.instance, "absence_type", None)
        absence_type = attrs.get("absence_type", instance_absence)

        if att_status == Attendance.Status.ABSENT and not absence_type:
            raise serializers.ValidationError(
                {"absence_type": "Précisez si l'absence est signalée ou non."},
            )
        if att_status != Attendance.Status.ABSENT and "absence_type" in attrs:
            attrs["absence_type"] = None

        return attrs


class AttendanceCheckInSerializer(serializers.Serializer):
    """Serializer pour le pointage d'entrée en temps réel."""

    employee_id = serializers.IntegerField()
    note = serializers.CharField(required=False, allow_blank=True)


class AttendanceCheckOutSerializer(serializers.Serializer):
    """Serializer pour le pointage de sortie en temps réel."""

    note = serializers.CharField(required=False, allow_blank=True)


class AttendanceMonthlyStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques mensuelles de présence (lecture seule)."""

    year = serializers.IntegerField()
    month = serializers.IntegerField()
    total_records = serializers.IntegerField()
    by_status = serializers.DictField()
    by_department = serializers.ListField()
    average_duration_hours = serializers.FloatField(allow_null=True)
