from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import LeaveRequestViewSet

router = DefaultRouter()
router.register('leaves', LeaveRequestViewSet, basename='leave-request')

urlpatterns = [
    path('', include(router.urls)),
]
