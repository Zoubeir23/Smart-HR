from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.discipline.views import DisciplinaryActionViewSet

router = DefaultRouter()
router.register("actions", DisciplinaryActionViewSet, basename="disciplinary-action")

urlpatterns = [path("", include(router.urls))]
