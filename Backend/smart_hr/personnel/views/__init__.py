from smart_hr.personnel.views.contract import ContractViewSet
from smart_hr.personnel.views.dashboard import DashboardStatsView
from smart_hr.personnel.views.department import DepartmentViewSet
from smart_hr.personnel.views.employee import EmployeeViewSet
from smart_hr.personnel.views.position import PositionViewSet
from smart_hr.personnel.views.reference_tables import DepartureReasonViewSet
from smart_hr.personnel.views.reference_tables import DiplomaViewSet
from smart_hr.personnel.views.reference_tables import FamilyStatusViewSet
from smart_hr.personnel.views.reference_tables import NationalityViewSet
from smart_hr.personnel.views.service import ServiceViewSet

__all__ = [
    "ContractViewSet",
    "DashboardStatsView",
    "DepartmentViewSet",
    "DepartureReasonViewSet",
    "DiplomaViewSet",
    "EmployeeViewSet",
    "FamilyStatusViewSet",
    "NationalityViewSet",
    "PositionViewSet",
    "ServiceViewSet",
]
