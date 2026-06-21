from django.contrib import admin

from smart_hr.discipline.models import DisciplinaryAction


@admin.register(DisciplinaryAction)
class DisciplinaryActionAdmin(admin.ModelAdmin):
    list_display = [
        "employee",
        "action_type",
        "reason",
        "incident_date",
        "issued_date",
        "suspension_duration_days",
        "issued_by",
        "created_at",
    ]
    list_filter = ["action_type", "issued_date", "employee__department"]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "reason",
    ]
    readonly_fields = ["suspension_duration_days", "created_at", "updated_at"]
    raw_id_fields = ["employee", "issued_by"]
    date_hierarchy = "issued_date"
    ordering = ["-issued_date"]

    def get_queryset(self, request):
        return (
            super()
            .get_queryset(request)
            .select_related(
                "employee__user",
                "employee__department",
                "issued_by",
            )
        )
