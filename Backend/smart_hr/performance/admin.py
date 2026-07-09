from django.contrib import admin

from smart_hr.performance.models import Feedback360
from smart_hr.performance.models import PerformanceEvaluation
from smart_hr.performance.models import Skill


@admin.register(Skill)
class SkillAdmin(admin.ModelAdmin):
    list_display = ["employee", "name", "category", "level", "created_at"]
    list_filter = ["category", "level"]
    search_fields = ["name", "employee__first_name", "employee__last_name"]
    ordering = ["employee", "category", "name"]


@admin.register(PerformanceEvaluation)
class PerformanceEvaluationAdmin(admin.ModelAdmin):
    list_display = ["employee", "year", "global_score", "status", "reviewer", "created_at"]
    list_filter = ["status", "year"]
    search_fields = ["employee__first_name", "employee__last_name", "objectives"]
    readonly_fields = ["created_at", "updated_at"]
    date_hierarchy = "created_at"

    fieldsets = [
        (
            "Évaluation",
            {"fields": ["employee", "reviewer", "year", "status"]},
        ),
        (
            "Contenu",
            {"fields": ["objectives", "achievements", "global_score", "comments"]},
        ),
        (
            "Métadonnées",
            {"fields": ["created_at", "updated_at"], "classes": ["collapse"]},
        ),
    ]


@admin.register(Feedback360)
class Feedback360Admin(admin.ModelAdmin):
    list_display = ["author", "recipient", "context", "created_at"]
    search_fields = ["author__first_name", "author__last_name", "recipient__first_name", "recipient__last_name", "comment"]
    readonly_fields = ["created_at", "updated_at"]
    ordering = ["-created_at"]
