from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.paiement.views import BenefitPlanViewSet
from smart_hr.paiement.views import BulletinPaieViewSet
from smart_hr.paiement.views import EmployeeBenefitViewSet
from smart_hr.paiement.views import PayrollViewSet

router = DefaultRouter()
router.register("payrolls", PayrollViewSet, basename="payroll")
router.register("bulletins", BulletinPaieViewSet, basename="bulletin-paie")
router.register("benefit-plans", BenefitPlanViewSet, basename="benefit-plan")
router.register("employee-benefits", EmployeeBenefitViewSet, basename="employee-benefit")

urlpatterns = [path("", include(router.urls))]
