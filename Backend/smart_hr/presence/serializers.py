from rest_framework import serializers

from smart_hr.presence.models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)

    class Meta:
        model = Attendance
        fields = ["id", "employee", "employee_name", "date", "check_in", "check_out", "status", "note"]
