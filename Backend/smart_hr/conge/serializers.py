from rest_framework import serializers

from smart_hr.conge.models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )
    duration_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "status",
            "start_date",
            "end_date",
            "reason",
            "approved_by",
            "duration_days",
            "created_at",
        ]
        read_only_fields = ["status", "approved_by", "employee", "created_at"]
