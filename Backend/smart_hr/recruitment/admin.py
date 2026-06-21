from django.contrib import admin

from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import ApplicationDocument
from smart_hr.recruitment.models import JobOffer


class ApplicationDocumentInline(admin.TabularInline):
    model = ApplicationDocument
    extra = 0
    fields = ["document_type", "label", "file"]
    readonly_fields = ["created_at"]


@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):
    list_display = ["title", "department", "job_type", "status", "created_at"]
    list_filter = ["status", "job_type"]
    search_fields = ["title", "department"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = [
        "candidate",
        "job_offer",
        "status",
        "matching_score",
        "onboarded",
        "created_at",
    ]
    list_filter = ["status", "onboarded", "gdpr_consent"]
    search_fields = ["candidate__email", "candidate__first_name", "candidate__last_name"]
    readonly_fields = ["matching_score", "skills_extracted", "ai_summary", "created_at", "updated_at"]
    inlines = [ApplicationDocumentInline]


@admin.register(ApplicationDocument)
class ApplicationDocumentAdmin(admin.ModelAdmin):
    list_display = ["application", "document_type", "label", "created_at"]
    list_filter = ["document_type"]
    search_fields = ["application__candidate__email", "label"]
    readonly_fields = ["created_at", "updated_at"]
