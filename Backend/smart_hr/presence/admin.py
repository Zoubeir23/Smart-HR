from django.contrib import admin

from smart_hr.presence.models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    """Admin enrichi pour les présences avec actions en masse."""

    list_display = [
        "employee",
        "date",
        "check_in",
        "check_out",
        "status",
        "note",
        "created_at",
    ]
    list_filter = ["status", "date", "employee__department"]
    search_fields = [
        "employee__user__first_name",
        "employee__user__last_name",
        "employee__user__email",
        "note",
    ]
    readonly_fields = ["created_at", "updated_at"]
    raw_id_fields = ["employee"]
    date_hierarchy = "date"
    ordering = ["-date"]

    actions = ["mark_present", "mark_absent", "mark_late"]

    @admin.action(description="✅ Marquer comme Présent")
    def mark_present(self, request, queryset):
        updated = queryset.update(status=Attendance.Status.PRESENT)
        self.message_user(request, f"{updated} présence(s) marquée(s) comme présent.")

    @admin.action(description="❌ Marquer comme Absent")
    def mark_absent(self, request, queryset):
        updated = queryset.update(status=Attendance.Status.ABSENT)
        self.message_user(request, f"{updated} présence(s) marquée(s) comme absent.")

    @admin.action(description="⏰ Marquer comme En retard")
    def mark_late(self, request, queryset):
        updated = queryset.update(status=Attendance.Status.LATE)
        self.message_user(request, f"{updated} présence(s) marquée(s) comme en retard.")

    def get_queryset(self, request):
        """Optimise avec select_related pour éviter les N+1."""
        return super().get_queryset(request).select_related(
            "employee__user", "employee__department"
        )
