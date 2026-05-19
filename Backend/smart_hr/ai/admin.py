from django.contrib import admin

from smart_hr.ai.models import ChatHistory, InterviewSession, InterviewSessionFeedback


@admin.register(ChatHistory)
class ChatHistoryAdmin(admin.ModelAdmin):
    list_display = ("user", "question", "created_at")
    list_filter = ("created_at",)
    search_fields = ("user__email", "question")
    ordering = ("-created_at",)


class InterviewSessionFeedbackInline(admin.TabularInline):
    model = InterviewSessionFeedback
    extra = 0
    fields = ("candidate_name", "candidate_email", "recommended", "created_at")
    readonly_fields = ("created_at",)


@admin.register(InterviewSession)
class InterviewSessionAdmin(admin.ModelAdmin):
    list_display = ("job_position", "interview_type", "duration", "status", "created_by", "created_at")
    list_filter = ("status", "interview_type", "created_at")
    search_fields = ("job_position", "created_by__email")
    readonly_fields = ("token", "created_at", "updated_at")
    ordering = ("-created_at",)
    inlines = [InterviewSessionFeedbackInline]


@admin.register(InterviewSessionFeedback)
class InterviewSessionFeedbackAdmin(admin.ModelAdmin):
    list_display = ("candidate_name", "candidate_email", "recommended", "session", "created_at")
    list_filter = ("recommended", "created_at")
    search_fields = ("candidate_name", "candidate_email", "session__job_position")
    ordering = ("-created_at",)
