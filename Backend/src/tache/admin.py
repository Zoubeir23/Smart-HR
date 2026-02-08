from django.contrib import admin
from .models import Task


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'title',
        'assignee',
        'created_by',
        'status',
        'priority',
        'due_date',
        'created_at',
    ]
    list_filter = ['status', 'priority', 'created_at']
    search_fields = [
        'title',
        'description',
        'assignee__user__first_name',
        'assignee__user__last_name',
        'assignee__user__email',
    ]
    raw_id_fields = ['assignee', 'created_by']
    readonly_fields = ['created_at']
