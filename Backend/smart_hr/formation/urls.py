from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.formation.views import FormationViewSet
from smart_hr.formation.views import MeetingViewSet

router = DefaultRouter()
router.register("formations", FormationViewSet, basename="formation")
router.register("meetings", MeetingViewSet, basename="meeting")

urlpatterns = [path("", include(router.urls))]
