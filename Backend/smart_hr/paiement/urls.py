from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.paiement.views import PayrollViewSet

router = DefaultRouter()
router.register("payrolls", PayrollViewSet, basename="payroll")

urlpatterns = [path("", include(router.urls))]
