from django.contrib import admin
from .models import Payroll


@admin.register(Payroll)
class PayrollAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'base_salary', 'net_salary', 'status']
    list_filter = ['status', 'month']
    search_fields = [
        'employee__user__first_name',
        'employee__user__last_name',
        'employee__user__email',
    ]
