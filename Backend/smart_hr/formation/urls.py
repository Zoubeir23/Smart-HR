from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.formation.views import FormationViewSet
from smart_hr.formation.views import MeetingViewSet
from smart_hr.formation.views import ParticipationViewSet

router = DefaultRouter()
router.register("formations", FormationViewSet, basename="formation")
router.register("meetings", MeetingViewSet, basename="meeting")
router.register("participations", ParticipationViewSet, basename="participation")

urlpatterns = [path("", include(router.urls))]
