from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.personnel.views import ContractViewSet
from smart_hr.personnel.views import DashboardStatsView
from smart_hr.personnel.views import DepartmentViewSet
from smart_hr.personnel.views import EmployeeViewSet
from smart_hr.personnel.views import PositionViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("positions", PositionViewSet, basename="position")
router.register("employees", EmployeeViewSet, basename="employee")
router.register("contracts", ContractViewSet, basename="contract")

urlpatterns = [
    path("", include(router.urls)),
    path("dashboard/", DashboardStatsView.as_view(), name="personnel-dashboard"),
]
