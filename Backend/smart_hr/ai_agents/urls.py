from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.ai_agents.views import VoiceAskView
from smart_hr.ai_agents.views import VoiceSessionViewSet

router = DefaultRouter()
router.register("voice/sessions", VoiceSessionViewSet, basename="voice-session")

urlpatterns = [
    path("voice/ask/", VoiceAskView.as_view(), name="voice-ask"),
    path("", include(router.urls)),
]
