from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.communication.views import DistressAlertViewSet
from smart_hr.communication.views import InternalMessageViewSet

router = DefaultRouter()
router.register("messages", InternalMessageViewSet, basename="internal-message")
router.register("distress-alerts", DistressAlertViewSet, basename="distress-alert")

urlpatterns = [path("", include(router.urls))]
