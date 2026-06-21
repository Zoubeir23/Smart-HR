from django.contrib import admin
from django.db.models import Count
from django.db.models import Sum

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import DepartureReason
from smart_hr.personnel.models import Diploma
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import FamilyMember
from smart_hr.personnel.models import FamilyStatus
from smart_hr.personnel.models import Nationality
from smart_hr.personnel.models import Position
from smart_hr.personnel.models import Service


@admin.register(Nationality)
class NationalityAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(FamilyStatus)
class FamilyStatusAdmin(admin.ModelAdmin):
    list_display = ["label"]
    search_fields = ["label"]


@admin.register(Diploma)
class DiplomaAdmin(admin.ModelAdmin):
    list_display = ["label"]
    search_fields = ["label"]


@admin.register(DepartureReason)
class DepartureReasonAdmin(admin.ModelAdmin):
    list_display = ["label"]
    search_fields = ["label"]


@admin.register(Service)
class ServiceAdmin(admin.ModelAdmin):
    list_display = ["name", "department", "employee_count_display", "position_count_display"]
    list_filter = ["department"]
    search_fields = ["name", "department__name"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("department")
            .annotate(_employee_count=Count("employees"), _position_count=Count("positions"))
        )

    @admin.display(description="Nb. employés", ordering="_employee_count")
    def employee_count_display(self, obj) -> int:
        return obj._employee_count  # noqa: SLF001

    @admin.display(description="Nb. postes", ordering="_position_count")
    def position_count_display(self, obj) -> int:
        return obj._position_count  # noqa: SLF001


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    """Admin enrichi pour les départements avec stats d'effectifs."""

    list_display = ["name", "description", "employee_count_display", "active_salary_display"]
    search_fields = ["name"]
    ordering = ["name"]

    def get_queryset(self, request):
        """Annotate le queryset avec les stats d'employés pour éviter le N+1."""
        return (
            super()
            .get_queryset(request)
            .annotate(
                _employee_count=Count("employees"),
                _total_salary=Sum("employees__salary"),
            )
        )

    @admin.display(description="Nb. employés", ordering="_employee_count")
    def employee_count_display(self, obj) -> int:
        return obj._employee_count  # noqa: SLF001

    @admin.display(description="Masse salariale", ordering="_total_salary")
    def active_salary_display(self, obj) -> str:
        return f"{obj._total_salary or 0:,.0f} FCFA"  # noqa: SLF001


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    """Admin enrichi pour les postes."""

    list_display = ["title", "service", "profile_type", "indicative_salary", "employee_count_display"]
    list_filter = ["service__department", "service", "profile_type"]
    search_fields = ["title", "service__name"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related("service__department").annotate(_employee_count=Count("employees"))

    @admin.display(description="Nb. employés", ordering="_employee_count")
    def employee_count_display(self, obj) -> int:
        return obj._employee_count  # noqa: SLF001


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """Admin enrichi pour les employés."""

    list_display = [
        "full_name_display",
        "matricule",
        "department",
        "service",
        "position",
        "status",
        "hire_date",
        "salary",
        "churn_risk",
    ]
    list_filter = ["status", "department", "service", "position", "nationality", "family_status"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "cin", "cnss_number", "matricule"]
    raw_id_fields = ["user"]
    readonly_fields = ["matricule", "churn_risk", "created_at", "updated_at"]
    ordering = ["user__last_name", "user__first_name"]

    actions = ["mark_active", "mark_inactive"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "user",
                "department",
                "service",
                "position",
                "nationality",
                "family_status",
                "diploma",
            )
        )

    @admin.display(description="Nom complet", ordering="user__last_name")
    def full_name_display(self, obj) -> str:
        return obj.user.get_full_name() or obj.user.email

    @admin.action(description="✅ Marquer comme Actif")
    def mark_active(self, request, queryset):
        updated = queryset.update(status=Employee.Status.ACTIVE)
        self.message_user(request, f"{updated} employé(s) marqué(s) comme actif(s).")

    @admin.action(description="🚫 Marquer comme Inactif")
    def mark_inactive(self, request, queryset):
        updated = queryset.update(status=Employee.Status.INACTIVE)
        self.message_user(request, f"{updated} employé(s) marqué(s) comme inactif(s).")


class FamilyMemberInline(admin.TabularInline):
    model = FamilyMember
    extra = 0
    fields = ["relationship", "first_name", "last_name", "date_of_birth", "gender"]


@admin.register(FamilyMember)
class FamilyMemberAdmin(admin.ModelAdmin):
    list_display = ["employee", "relationship", "first_name", "last_name", "date_of_birth"]
    list_filter = ["relationship", "gender"]
    search_fields = ["first_name", "last_name", "employee__user__last_name"]
    autocomplete_fields = ["employee"]
