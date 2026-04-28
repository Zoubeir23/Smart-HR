from django.contrib import admin
from django.db.models import Count, Sum

from smart_hr.personnel.models import Department, Employee, Position


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
        return obj._employee_count

    @admin.display(description="Masse salariale", ordering="_total_salary")
    def active_salary_display(self, obj) -> str:
        return f"{obj._total_salary or 0:,.0f} FCFA"


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    """Admin enrichi pour les postes."""

    list_display = ["title", "department", "employee_count_display"]
    list_filter = ["department"]
    search_fields = ["title"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related("department")
            .annotate(_employee_count=Count("employees"))
        )

    @admin.display(description="Nb. employés", ordering="_employee_count")
    def employee_count_display(self, obj) -> int:
        return obj._employee_count


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    """Admin enrichi pour les employés."""

    list_display = [
        "full_name_display",
        "department",
        "position",
        "status",
        "hire_date",
        "salary",
        "churn_risk",
    ]
    list_filter = ["status", "department", "position"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "cin"]
    raw_id_fields = ["user"]
    readonly_fields = ["churn_risk", "created_at", "updated_at"]
    ordering = ["user__last_name", "user__first_name"]

    actions = ["mark_active", "mark_inactive"]

    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            "user", "department", "position"
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
