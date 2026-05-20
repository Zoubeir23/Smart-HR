from django.contrib import admin

from smart_hr.core.models import AuditLog
from smart_hr.core.models import Notification


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ["timestamp", "performed_by", "action", "model_name", "object_repr"]
    list_filter = ["action", "model_name"]
    search_fields = ["performed_by__email", "object_repr", "object_id"]
    readonly_fields = ["performed_by", "action", "model_name", "object_id", "object_repr", "details", "timestamp"]
    ordering = ["-timestamp"]

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ["created_at", "recipient", "notification_type", "title", "is_read"]
    list_filter = ["notification_type", "is_read"]
    search_fields = ["recipient__email", "title", "message"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
