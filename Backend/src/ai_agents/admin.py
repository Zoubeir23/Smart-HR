from django.contrib import admin
from .models import CVAnalysis, VoiceSession, AgentLog


@admin.register(CVAnalysis)
class CVAnalysisAdmin(admin.ModelAdmin):
    list_display = ('application', 'selected', 'experience_level', 'analyzed_at')
    list_filter = ('selected', 'experience_level')
    search_fields = ('feedback',)
    readonly_fields = ('analyzed_at',)


@admin.register(VoiceSession)
class VoiceSessionAdmin(admin.ModelAdmin):
    list_display = ('pk', 'user', 'voice', 'created_at')
    list_filter = ('voice',)
    search_fields = ('query', 'text_response')
    readonly_fields = ('created_at',)


@admin.register(AgentLog)
class AgentLogAdmin(admin.ModelAdmin):
    list_display = ('agent_type', 'action', 'status', 'created_at')
    list_filter = ('agent_type', 'status')
    search_fields = ('action', 'error_message')
    readonly_fields = ('created_at',)
