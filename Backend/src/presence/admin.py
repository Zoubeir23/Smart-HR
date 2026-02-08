from django.contrib import admin
from .models import Attendance


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'date', 'check_in', 'check_out', 'status']
    list_filter = ['status', 'date']
    search_fields = [
        'employee__user__first_name',
        'employee__user__last_name',
        'employee__user__email',
    ]
    date_hierarchy = 'date'
