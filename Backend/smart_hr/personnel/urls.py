from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.personnel.views import CareerPathViewSet
from smart_hr.personnel.views import ContractViewSet
from smart_hr.personnel.views import DashboardStatsView
from smart_hr.personnel.views import DepartmentViewSet
from smart_hr.personnel.views import DepartureReasonViewSet
from smart_hr.personnel.views import DiplomaViewSet
from smart_hr.personnel.views import EmployeeViewSet
from smart_hr.personnel.views import FamilyMemberViewSet
from smart_hr.personnel.views import FamilyStatusViewSet
from smart_hr.personnel.views import NationalityViewSet
from smart_hr.personnel.views import ObjectiveViewSet
from smart_hr.personnel.views import OnboardingProgramViewSet
from smart_hr.personnel.views import PositionViewSet
from smart_hr.personnel.views import ServiceViewSet
from smart_hr.personnel.views import SuccessionPlanViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("services", ServiceViewSet, basename="service")
router.register("positions", PositionViewSet, basename="position")
router.register("employees", EmployeeViewSet, basename="employee")
router.register("contracts", ContractViewSet, basename="contract")
router.register("family-members", FamilyMemberViewSet, basename="family-member")
router.register("ref/nationalities", NationalityViewSet, basename="nationality")
router.register("ref/family-statuses", FamilyStatusViewSet, basename="family-status")
router.register("ref/diplomas", DiplomaViewSet, basename="diploma")
router.register("ref/departure-reasons", DepartureReasonViewSet, basename="departure-reason")
router.register("onboarding-programs", OnboardingProgramViewSet, basename="onboarding-program")
router.register("objectives", ObjectiveViewSet, basename="objective")
router.register("career-paths", CareerPathViewSet, basename="career-path")
router.register("succession-plans", SuccessionPlanViewSet, basename="succession-plan")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", DashboardStatsView.as_view(), name="personnel-dashboard"),
]
