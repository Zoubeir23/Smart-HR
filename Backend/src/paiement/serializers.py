from rest_framework import serializers
from utilisateur.serializers import UserSerializer
from .models import Payroll


class PayrollListSerializer(serializers.ModelSerializer):
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
        model = Payroll
        fields = [
            'id', 'employee', 'employee_name', 'employee_user',
            'department_name', 'month', 'base_salary', 'bonuses',
            'deductions', 'net_salary', 'status', 'status_display',
            'created_at',
        ]
        read_only_fields = ['id', 'net_salary', 'created_at']


class PayrollCreateSerializer(serializers.ModelSerializer):
    """Write serializer for creating / updating payroll records."""

    class Meta:
        model = Payroll
        fields = [
            'id', 'employee', 'month', 'base_salary', 'bonuses',
            'deductions', 'status',
        ]
        read_only_fields = ['id']
