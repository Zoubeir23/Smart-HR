from django.urls import path, include

urlpatterns = [
    path('recruitment/', include('ai_agents.recruitment_agent.urls')),
    path('voice/', include('ai_agents.voice_agent.urls')),
]
