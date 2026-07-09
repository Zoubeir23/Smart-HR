from __future__ import annotations

from decimal import Decimal

from django.utils import translation
from rest_framework import serializers

from smart_hr.paiement.models import BenefitPlan
from smart_hr.paiement.models import BulletinPaie
from smart_hr.paiement.models import EmployeeBenefit
from smart_hr.paiement.models import LigneBulletin
from smart_hr.paiement.models import Payroll


class LigneBulletinSerializer(serializers.ModelSerializer):
    nature_display = serializers.CharField(source="get_nature_display", read_only=True)

    class Meta:
        model = LigneBulletin
        fields = ["id", "libelle", "nature", "nature_display", "base", "taux", "montant", "ordre_affichage"]
        read_only_fields = fields


class BulletinPaieSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    employee_matricule = serializers.CharField(source="employee.matricule", read_only=True)
    department_name = serializers.CharField(source="employee.department.name", read_only=True, default="")
    position_title = serializers.CharField(source="employee.position.title", read_only=True, default="")
    pays_nom = serializers.CharField(source="employee.pays.nom", read_only=True, default="")
    devise = serializers.CharField(source="employee.pays.devise", read_only=True, default="")
    statut_display = serializers.CharField(source="get_statut_display", read_only=True)
    periode_display = serializers.SerializerMethodField()
    lignes = LigneBulletinSerializer(many=True, read_only=True)

    class Meta:
        model = BulletinPaie
        fields = [
            "id",
            "employee",
            "employee_name",
            "employee_matricule",
            "department_name",
            "position_title",
            "pays_nom",
            "devise",
            "periode",
            "periode_display",
            "salaire_brut",
            "cotisations_salariales",
            "cotisations_patronales",
            "net_imposable",
            "impot",
            "net_a_payer",
            "statut",
            "statut_display",
            "lignes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "salaire_brut",
            "cotisations_salariales",
            "cotisations_patronales",
            "net_imposable",
            "impot",
            "net_a_payer",
            "statut_display",
            "lignes",
            "created_at",
            "updated_at",
        ]

    def get_periode_display(self, obj: BulletinPaie) -> str:
        if not obj.periode:
            return ""
        with translation.override("fr"):
            from django.utils.formats import date_format

            return date_format(obj.periode, "F Y")


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
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    gross_salary = serializers.SerializerMethodField()

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
            "gross_salary",
            "net_salary",
            "status",
            "status_display",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["net_salary", "gross_salary", "created_at", "updated_at"]

    def get_gross_salary(self, obj: Payroll) -> Decimal:
        return obj.base_salary + obj.bonuses

    def validate_month(self, value: str) -> str:
        """Valide le format YYYY-MM."""
        import re

        if not re.match(r"^\d{4}-\d{2}$", value):
            raise serializers.ValidationError(
                "Le mois doit être au format YYYY-MM (ex: 2026-01).",
            )
        return value

    def validate(self, attrs):
        """Vérifie la cohérence des montants."""
        base = attrs.get("base_salary", Decimal("0"))
        bonuses = attrs.get("bonuses", Decimal("0"))
        deductions = attrs.get("deductions", Decimal("0"))
        if base < 0:
            raise serializers.ValidationError(
                {"base_salary": "Le salaire de base ne peut pas être négatif."},
            )
        if deductions > base + bonuses:
            raise serializers.ValidationError(
                {"deductions": "Les déductions ne peuvent pas dépasser le salaire brut."},
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


class BenefitPlanSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source="get_category_display", read_only=True)
    enrolled_count = serializers.SerializerMethodField()

    class Meta:
        model = BenefitPlan
        fields = [
            "id",
            "name",
            "category",
            "category_display",
            "description",
            "employer_contribution",
            "employee_contribution",
            "is_active",
            "enrolled_count",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def get_enrolled_count(self, obj: BenefitPlan) -> int:
        """Compte en Python sur le cache prefetch (`obj.enrollments.all()`) plutôt
        que via `.filter()`, qui ignorerait le prefetch_related du queryset et
        déclencherait une requête par ligne (N+1)."""
        return sum(1 for enrollment in obj.enrollments.all() if enrollment.status == EmployeeBenefit.Status.ACTIVE)


class EmployeeBenefitSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    plan_name = serializers.CharField(source="plan.name", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = EmployeeBenefit
        fields = [
            "id",
            "employee",
            "employee_name",
            "plan",
            "plan_name",
            "status",
            "status_display",
            "enrolled_at",
            "terminated_at",
        ]
        read_only_fields = ["id", "enrolled_at"]

    def validate(self, attrs: dict) -> dict:
        employee = attrs.get("employee") or getattr(self.instance, "employee", None)
        plan = attrs.get("plan") or getattr(self.instance, "plan", None)
        status = attrs.get("status", getattr(self.instance, "status", EmployeeBenefit.Status.PENDING))

        if status != EmployeeBenefit.Status.TERMINATED and employee is not None and plan is not None:
            duplicate = EmployeeBenefit.objects.filter(employee=employee, plan=plan).exclude(
                status=EmployeeBenefit.Status.TERMINATED
            )
            if self.instance is not None:
                duplicate = duplicate.exclude(pk=self.instance.pk)
            if duplicate.exists():
                raise serializers.ValidationError({"plan": "Cet employé est déjà inscrit (activement) à ce plan d'avantage."})
        return attrs
