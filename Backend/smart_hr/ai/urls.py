from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.ai.views import ChatHistoryViewSet

router = DefaultRouter()
router.register("chat", ChatHistoryViewSet, basename="chat")

urlpatterns = [path("", include(router.urls))]
