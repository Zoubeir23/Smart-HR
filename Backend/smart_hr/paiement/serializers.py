from decimal import Decimal

from rest_framework import serializers

from smart_hr.paiement.models import Payroll
from smart_hr.personnel.models import Employee


class PayrollSerializer(serializers.ModelSerializer):
    """Serializer complet pour une fiche de paie."""

    employee_name = serializers.CharField(
        source="employee.user.get_full_name",
        read_only=True,
    )
    department_name = serializers.CharField(
        source="employee.department.name",
        read_only=True,
        default="",
    )
    employee_email = serializers.EmailField(
        source="employee.user.email",
        read_only=True,
    )

    class Meta:
        model = Payroll
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_email",
            "department_name",
            "month",
            "base_salary",
            "bonuses",
            "deductions",
            "net_salary",
            "status",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["net_salary", "created_at", "updated_at"]

    def validate_month(self, value: str) -> str:
        """Valide le format YYYY-MM."""
        import re
        if not re.match(r"^\d{4}-\d{2}$", value):
            raise serializers.ValidationError(
                "Le mois doit être au format YYYY-MM (ex: 2026-01)."
            )
        return value

    def validate(self, attrs):
        """Vérifie la cohérence des montants."""
        base = attrs.get("base_salary", Decimal("0"))
        bonuses = attrs.get("bonuses", Decimal("0"))
        deductions = attrs.get("deductions", Decimal("0"))
        if base < 0:
            raise serializers.ValidationError(
                {"base_salary": "Le salaire de base ne peut pas être négatif."}
            )
        if deductions > base + bonuses:
            raise serializers.ValidationError(
                {"deductions": "Les déductions ne peuvent pas dépasser le salaire brut."}
            )
        return attrs


class PayrollBulkGenerateSerializer(serializers.Serializer):
    """Serializer pour la génération en masse de fiches de paie."""

    month = serializers.CharField(max_length=7)
    department_id = serializers.IntegerField(required=False, allow_null=True)

    def validate_month(self, value: str) -> str:
        import re
        if not re.match(r"^\d{4}-\d{2}$", value):
            raise serializers.ValidationError("Format attendu : YYYY-MM")
        return value


class PayrollStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques de paie (lecture seule)."""

    month = serializers.CharField()
    total_payrolls = serializers.IntegerField()
    total_net_salary = serializers.DecimalField(max_digits=14, decimal_places=2)
    by_status = serializers.DictField()
    by_department = serializers.ListField()
