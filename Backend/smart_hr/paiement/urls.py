from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.paiement.views import BulletinPaieViewSet
from smart_hr.paiement.views import PayrollViewSet

router = DefaultRouter()
router.register("payrolls", PayrollViewSet, basename="payroll")
router.register("bulletins", BulletinPaieViewSet, basename="bulletin-paie")

urlpatterns = [path("", include(router.urls))]
