from django.urls import path

from smart_hr.ai_agents.views import VoiceAskView

urlpatterns = [
    path("voice/ask/", VoiceAskView.as_view(), name="voice-ask"),
]
