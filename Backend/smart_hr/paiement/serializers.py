from rest_framework import serializers

from smart_hr.paiement.models import Payroll


class PayrollSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)

    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee",
            "employee_name",
            "month",
            "base_salary",
            "bonuses",
            "deductions",
            "net_salary",
            "status",
            "created_at",
        ]
        read_only_fields = ["net_salary", "created_at"]
