from rest_framework import serializers

from smart_hr.discipline.models import DisciplinaryAction


class DisciplinaryActionSerializer(serializers.ModelSerializer):
    """Serializer complet pour une action disciplinaire."""

    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="employee.department.name",
        read_only=True,
        default="",
    )
    issued_by_name = serializers.CharField(
        source="issued_by.get_full_name",
        read_only=True,
        default="",
    )
    action_type_display = serializers.CharField(
        source="get_action_type_display",
        read_only=True,
    )
    suspension_duration_days = serializers.IntegerField(
        read_only=True,
        allow_null=True,
    )

    class Meta:
        model = DisciplinaryAction
        fields = [
            "id",
            "employee",
            "employee_name",
            "department_name",
            "action_type",
            "action_type_display",
            "reason",
            "description",
            "incident_date",
            "issued_date",
            "suspension_start",
            "suspension_end",
            "suspension_duration_days",
            "issued_by",
            "issued_by_name",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["issued_by", "created_at", "updated_at"]

    def validate(self, attrs: dict) -> dict:
        action_type = attrs.get("action_type", getattr(self.instance, "action_type", None))
        suspension_start = attrs.get("suspension_start", getattr(self.instance, "suspension_start", None))
        suspension_end = attrs.get("suspension_end", getattr(self.instance, "suspension_end", None))
        incident_date = attrs.get("incident_date", getattr(self.instance, "incident_date", None))
        issued_date = attrs.get("issued_date", getattr(self.instance, "issued_date", None))

        if action_type == DisciplinaryAction.ActionType.SUSPENSION:
            if not suspension_start or not suspension_end:
                raise serializers.ValidationError(
                    {"suspension_start": "Les dates de suspension sont obligatoires pour une mise à pied."}
                )
            if suspension_end < suspension_start:
                raise serializers.ValidationError(
                    {"suspension_end": "La date de fin doit être postérieure à la date de début."}
                )
        else:
            attrs["suspension_start"] = None
            attrs["suspension_end"] = None

        if incident_date and issued_date and issued_date < incident_date:
            raise serializers.ValidationError(
                {"issued_date": "La date d'émission ne peut pas être antérieure à la date de l'incident."}
            )

        return attrs
