from django.contrib import admin
from .models import JobOffer, Application


@admin.register(JobOffer)
class JobOfferAdmin(admin.ModelAdmin):
    list_display = ('title', 'department', 'job_type', 'status', 'created_at')
    list_filter = ('status', 'job_type')
    search_fields = ('title', 'department', 'description')


@admin.register(Application)
class ApplicationAdmin(admin.ModelAdmin):
    list_display = ('candidate', 'job_offer', 'status', 'matching_score', 'created_at')
    list_filter = ('status',)
    search_fields = ('candidate__email', 'candidate__first_name', 'job_offer__title')
    raw_id_fields = ('candidate', 'job_offer')
