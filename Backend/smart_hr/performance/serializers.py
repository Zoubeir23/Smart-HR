from __future__ import annotations

from rest_framework import serializers

from smart_hr.performance.models import Feedback360
from smart_hr.performance.models import PerformanceEvaluation
from smart_hr.performance.models import Skill
from smart_hr.performance.models import SkillDefinition


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
        user = obj.employee.user
        return f"{user.first_name} {user.last_name}".strip() or user.email


class SkillDefinitionSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)

    class Meta:
        model = SkillDefinition
        fields = ["id", "name", "category", "category_display", "description", "created_at"]
        read_only_fields = ["id", "created_at"]


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
        user = obj.employee.user
        return f"{user.first_name} {user.last_name}".strip() or user.email

    def get_reviewer_name(self, obj: PerformanceEvaluation) -> str:
        if obj.reviewer:
            user = obj.reviewer.user
            return f"{user.first_name} {user.last_name}".strip() or user.email
        return "—"

    def validate_year(self, value: int) -> int:
        if value < 2000 or value > 2100:
            raise serializers.ValidationError("Année invalide.")
        return value

    def validate_global_score(self, value: int | None) -> int | None:
        if value is not None and not (0 <= value <= 100):
            raise serializers.ValidationError("Le score doit être compris entre 0 et 100.")
        return value


class Feedback360Serializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    recipient_name = serializers.SerializerMethodField()

    class Meta:
        model = Feedback360
        fields = [
            "id",
            "author",
            "author_name",
            "recipient",
            "recipient_name",
            "context",
            "comment",
            "tags",
            "created_at",
        ]
        read_only_fields = ["id", "author", "created_at"]

    def get_author_name(self, obj: Feedback360) -> str:
        user = obj.author.user
        return f"{user.first_name} {user.last_name}".strip() or user.email

    def get_recipient_name(self, obj: Feedback360) -> str:
        user = obj.recipient.user
        return f"{user.first_name} {user.last_name}".strip() or user.email

    def validate_tags(self, value: list) -> list:
        valid_tags = {choice[0] for choice in Feedback360.Tag.choices}
        invalid = [tag for tag in value if tag not in valid_tags]
        if invalid:
            raise serializers.ValidationError(f"Tags invalides : {', '.join(invalid)}.")
        return value

    def validate_recipient(self, value):
        request = self.context.get("request")
        if request is not None:
            author_employee = getattr(request.user, "employee_profile", None)
            if author_employee is not None and value.pk == author_employee.pk:
                raise serializers.ValidationError("Vous ne pouvez pas vous laisser un feedback à vous-même.")
        return value
