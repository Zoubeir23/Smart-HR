from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.document.views import DocumentViewSet
from smart_hr.document.views import SignatureRequestViewSet
from smart_hr.document.views import SignatureViewSet

router = DefaultRouter()
router.register("documents", DocumentViewSet, basename="document")
router.register("signatures", SignatureViewSet, basename="signature")
router.register("signature-requests", SignatureRequestViewSet, basename="signature-request")

urlpatterns = [path("", include(router.urls))]
