from django.contrib import admin

from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position


@admin.register(Department)
class DepartmentAdmin(admin.ModelAdmin):
    list_display = ["name"]
    search_fields = ["name"]


@admin.register(Position)
class PositionAdmin(admin.ModelAdmin):
    list_display = ["title", "department"]
    list_filter = ["department"]
    search_fields = ["title"]


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ["user", "department", "position", "status", "hire_date", "churn_risk"]
    list_filter = ["status", "department"]
    search_fields = ["user__first_name", "user__last_name", "user__email", "cin"]
    raw_id_fields = ["user"]
