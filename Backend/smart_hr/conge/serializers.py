from rest_framework import serializers

from smart_hr.conge.models import LeaveRequest


class LeaveRequestSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )
    leave_type_display = serializers.CharField(
        source="get_leave_type_display",
        read_only=True,
    )
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    duration_days = serializers.IntegerField(read_only=True)
    duration_working_days = serializers.IntegerField(read_only=True)
    is_deductible = serializers.BooleanField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            "id",
            "employee",
            "employee_name",
            "leave_type",
            "leave_type_display",
            "status",
            "status_display",
            "start_date",
            "end_date",
            "reason",
            "approved_by",
            "duration_days",
            "duration_working_days",
            "is_deductible",
            "created_at",
        ]
        read_only_fields = ["status", "approved_by", "employee", "created_at"]
