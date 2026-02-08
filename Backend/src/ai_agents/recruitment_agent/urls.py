from django.urls import path

from . import views

urlpatterns = [
    path('analyze-cv/', views.analyze_cv, name='analyze_cv'),
    path('schedule-interview/', views.schedule_interview, name='schedule_interview'),
    path('send-email/', views.send_email, name='send_email'),
    path('process-application/', views.process_application, name='process_application'),
]
