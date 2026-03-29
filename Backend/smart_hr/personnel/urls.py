from django.urls import include
from django.urls import path
from rest_framework.routers import DefaultRouter

from smart_hr.personnel.views import DepartmentViewSet
from smart_hr.personnel.views import EmployeeViewSet
from smart_hr.personnel.views import PositionViewSet

router = DefaultRouter()
router.register("departments", DepartmentViewSet, basename="department")
router.register("positions", PositionViewSet, basename="position")
router.register("employees", EmployeeViewSet, basename="employee")

urlpatterns = [path("", include(router.urls))]
