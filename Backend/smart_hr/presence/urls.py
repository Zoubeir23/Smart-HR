from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.presence.views import AttendanceViewSet

router = DefaultRouter()
router.register("attendances", AttendanceViewSet, basename="attendance")

urlpatterns = [path("", include(router.urls))]
