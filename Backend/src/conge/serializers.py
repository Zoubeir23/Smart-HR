from rest_framework import serializers
from utilisateur.serializers import UserSerializer
from .models import LeaveRequest


class LeaveRequestListSerializer(serializers.ModelSerializer):
    """Serializer used for listing leave requests with nested read-only info."""

    employee_id = serializers.IntegerField(source='employee.id', read_only=True)
    employee_name = serializers.CharField(
        source='employee.user.get_full_name', read_only=True,
    )
    employee_email = serializers.EmailField(
        source='employee.user.email', read_only=True,
    )
    department = serializers.CharField(
        source='employee.department.name', read_only=True, default=None,
    )
    leave_type_display = serializers.CharField(
        source='get_leave_type_display', read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    approved_by_name = serializers.CharField(
        source='approved_by.get_full_name', read_only=True, default=None,
    )
    duration_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'employee', 'employee_id', 'employee_name', 'employee_email',
            'department',
            'leave_type', 'leave_type_display',
            'status', 'status_display',
            'start_date', 'end_date', 'duration_days',
            'reason',
            'approved_by', 'approved_by_name',
            'created_at',
        ]
        read_only_fields = [
            'id', 'status', 'approved_by', 'created_at',
        ]


class LeaveRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer used when an employee creates a new leave request."""

    class Meta:
        model = LeaveRequest
        fields = [
            'id', 'leave_type', 'start_date', 'end_date', 'reason',
        ]
        read_only_fields = ['id']

    def validate(self, data):
        if data['start_date'] > data['end_date']:
            raise serializers.ValidationError(
                {'end_date': 'La date de fin doit être postérieure à la date de début.'}
            )
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        employee = user.employee_profile
        return LeaveRequest.objects.create(employee=employee, **validated_data)


class LeaveRequestSerializer(serializers.ModelSerializer):
    """Full detail serializer for a single leave request."""

    employee_user = UserSerializer(source='employee.user', read_only=True)
    approved_by_user = UserSerializer(source='approved_by', read_only=True)
    leave_type_display = serializers.CharField(
        source='get_leave_type_display', read_only=True,
    )
    status_display = serializers.CharField(
        source='get_status_display', read_only=True,
    )
    duration_days = serializers.IntegerField(read_only=True)
    department = serializers.CharField(
        source='employee.department.name', read_only=True, default=None,
    )
    position = serializers.CharField(
        source='employee.position.title', read_only=True, default=None,
    )

    class Meta:
        model = LeaveRequest
        fields = [
            'id',
            'employee', 'employee_user',
            'department', 'position',
            'leave_type', 'leave_type_display',
            'status', 'status_display',
            'start_date', 'end_date', 'duration_days',
            'reason',
            'approved_by', 'approved_by_user',
            'created_at',
        ]
        read_only_fields = fields
