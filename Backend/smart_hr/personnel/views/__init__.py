from smart_hr.personnel.views.career_path import CareerPathViewSet
from smart_hr.personnel.views.contract import ContractViewSet
from smart_hr.personnel.views.dashboard import DashboardStatsView
from smart_hr.personnel.views.department import DepartmentViewSet
from smart_hr.personnel.views.employee import EmployeeViewSet
from smart_hr.personnel.views.family_member import FamilyMemberViewSet
from smart_hr.personnel.views.objective import ObjectiveViewSet
from smart_hr.personnel.views.onboarding import OnboardingProgramViewSet
from smart_hr.personnel.views.position import PositionViewSet
from smart_hr.personnel.views.reference_tables import DepartureReasonViewSet
from smart_hr.personnel.views.reference_tables import DiplomaViewSet
from smart_hr.personnel.views.reference_tables import FamilyStatusViewSet
from smart_hr.personnel.views.reference_tables import NationalityViewSet
from smart_hr.personnel.views.service import ServiceViewSet
from smart_hr.personnel.views.succession_plan import SuccessionPlanViewSet

__all__ = [
    "CareerPathViewSet",
    "ContractViewSet",
    "DashboardStatsView",
    "DepartmentViewSet",
    "DepartureReasonViewSet",
    "DiplomaViewSet",
    "EmployeeViewSet",
    "FamilyMemberViewSet",
    "FamilyStatusViewSet",
    "NationalityViewSet",
    "ObjectiveViewSet",
    "OnboardingProgramViewSet",
    "PositionViewSet",
    "ServiceViewSet",
    "SuccessionPlanViewSet",
]
