from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.tache.views import TaskViewSet

router = DefaultRouter()
router.register("tasks", TaskViewSet, basename="task")

urlpatterns = [path("", include(router.urls))]
