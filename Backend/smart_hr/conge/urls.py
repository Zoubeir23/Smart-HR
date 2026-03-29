from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.conge.views import LeaveRequestViewSet

router = DefaultRouter()
router.register("leave-requests", LeaveRequestViewSet, basename="leave-request")

urlpatterns = [path("", include(router.urls))]
