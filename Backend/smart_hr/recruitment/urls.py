from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.recruitment.views import ApplicationDocumentViewSet
from smart_hr.recruitment.views import ApplicationViewSet
from smart_hr.recruitment.views import JobOfferViewSet

router = DefaultRouter()
router.register("job-offers", JobOfferViewSet, basename="job-offer")
router.register("applications", ApplicationViewSet, basename="application")
router.register("application-documents", ApplicationDocumentViewSet, basename="application-document")

urlpatterns = [path("", include(router.urls))]
