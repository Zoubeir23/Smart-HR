from django.contrib import admin
from .models import ChurnPrediction


@admin.register(ChurnPrediction)
class ChurnPredictionAdmin(admin.ModelAdmin):
    list_display = ('employee', 'risk_score', 'risk_level', 'created_at')
    list_filter = ('risk_level', 'created_at')
    search_fields = ('employee__user__first_name', 'employee__user__last_name')
    raw_id_fields = ('employee',)
