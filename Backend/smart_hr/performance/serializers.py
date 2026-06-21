from __future__ import annotations

from rest_framework import serializers

from smart_hr.performance.models import PerformanceEvaluation
from smart_hr.performance.models import Skill


class SkillSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    employee_name = serializers.SerializerMethodField()

    class Meta:
        model = Skill
        fields = [
            "id",
            "employee",
            "employee_name",
            "name",
            "category",
            "category_display",
            "level",
            "notes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_employee_name(self, obj: Skill) -> str:
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip() or obj.employee.email


class PerformanceEvaluationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    employee_name = serializers.SerializerMethodField()
    reviewer_name = serializers.SerializerMethodField()

    class Meta:
        model = PerformanceEvaluation
        fields = [
            "id",
            "employee",
            "employee_name",
            "reviewer",
            "reviewer_name",
            "year",
            "objectives",
            "achievements",
            "global_score",
            "status",
            "status_display",
            "comments",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def get_employee_name(self, obj: PerformanceEvaluation) -> str:
        return f"{obj.employee.first_name} {obj.employee.last_name}".strip() or obj.employee.email

    def get_reviewer_name(self, obj: PerformanceEvaluation) -> str:
        if obj.reviewer:
            return f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip() or obj.reviewer.email
        return "—"

    def validate_year(self, value: int) -> int:
        if value < 2000 or value > 2100:
            raise serializers.ValidationError("Année invalide.")
        return value

    def validate_global_score(self, value: int | None) -> int | None:
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Le score doit être compris entre 0 et 100.")
        return value
