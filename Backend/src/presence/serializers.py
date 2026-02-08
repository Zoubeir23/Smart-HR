from rest_framework import serializers
from utilisateur.serializers import UserSerializer
from .models import Attendance


class AttendanceSerializer(serializers.ModelSerializer):
    """Read serializer with nested employee / user info."""

    employee_name = serializers.CharField(
        source='employee.user.get_full_name', read_only=True,
    )
    employee_user = UserSerializer(source='employee.user', read_only=True)
    department_name = serializers.CharField(
        source='employee.department.name', read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )

    class Meta:
        model = Attendance
        fields = [
            'id', 'employee', 'employee_name', 'employee_user',
            'department_name', 'date', 'check_in', 'check_out',
            'status', 'status_display', 'note',
        ]
        read_only_fields = ['id']


class AttendanceCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating / updating attendance records."""

    class Meta:
        model = Attendance
        fields = ['id', 'employee', 'date', 'check_in', 'check_out', 'status', 'note']
        read_only_fields = ['id']
