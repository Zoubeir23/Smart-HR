from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.survey.views import SurveyViewSet

router = DefaultRouter()
router.register("surveys", SurveyViewSet, basename="survey")

urlpatterns = [path("", include(router.urls))]
