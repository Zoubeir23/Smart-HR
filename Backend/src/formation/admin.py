from django.contrib import admin

from .models import Formation, Meeting, ZoomToken


@admin.register(Formation)
class FormationAdmin(admin.ModelAdmin):
    list_display = ['title', 'instructor', 'start_date', 'end_date', 'created_at']
    list_filter = ['start_date', 'created_at']
    search_fields = ['title', 'instructor']


@admin.register(Meeting)
class MeetingAdmin(admin.ModelAdmin):
    list_display = ['title', 'formation', 'start_time', 'end_time', 'status']
    list_filter = ['status', 'start_time']
    search_fields = ['title', 'formation__title']
    raw_id_fields = ['formation']


@admin.register(ZoomToken)
class ZoomTokenAdmin(admin.ModelAdmin):
    list_display = ['token_type', 'scope', 'created_at']
    readonly_fields = ['access_token', 'refresh_token']
