from django.contrib import admin
from .models import LeaveRequest


@admin.register(LeaveRequest)
class LeaveRequestAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'employee',
        'leave_type',
        'status',
        'start_date',
        'end_date',
        'approved_by',
        'created_at',
    ]
    list_filter = ['status', 'leave_type', 'created_at']
    search_fields = [
        'employee__user__first_name',
        'employee__user__last_name',
        'employee__user__email',
        'reason',
    ]
    raw_id_fields = ['employee', 'approved_by']
    readonly_fields = ['created_at']
