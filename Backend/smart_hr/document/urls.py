from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.document.views import DocumentViewSet

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")

urlpatterns = [path("", include(router.urls))]
