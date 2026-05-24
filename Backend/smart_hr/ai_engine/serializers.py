from rest_framework import serializers

from smart_hr.ai_engine.models import ChurnPrediction


class ChurnPredictionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )
    first_name = serializers.CharField(
        source="employee.user.first_name",
        read_only=True,
    )
    last_name = serializers.CharField(
        source="employee.user.last_name",
        read_only=True,
    )
    department = serializers.SerializerMethodField()
    tenure = serializers.SerializerMethodField()

    class Meta:
        model = ChurnPrediction
        fields = [
            "id",
            "employee",
            "employee_name",
            "first_name",
            "last_name",
            "department",
            "tenure",
            "risk_score",
            "risk_level",
            "factors",
            "recommendations",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_department(self, obj) -> str:
        if obj.employee and obj.employee.department:
            return obj.employee.department.name
        return "—"

    def get_tenure(self, obj) -> str:
        from django.utils import timezone

        if obj.employee and obj.employee.hire_date:
            years = (timezone.now().date() - obj.employee.hire_date).days // 365
            return f"{years} an{'s' if years > 1 else ''}"
        return "—"
