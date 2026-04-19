import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class AdminStatsView(APIView):
    """
    GET /api/v1/auth/admin/stats/
    Statistiques globales plateforme — accessible RH et Admin.
    """

    permission_classes = [IsRH]

    def get(self, request):
        from smart_hr.personnel.models import Employee

        total_users = User.objects.count()
        by_role = {
            role: User.objects.filter(role=role).count()
            for role in [
                User.Role.ADMIN,
                User.Role.RH,
                User.Role.EMPLOYEE,
                User.Role.CANDIDATE,
            ]
        }
        active_roles = sum(1 for count in by_role.values() if count > 0)

        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(status="active").count()
        high_risk_employees = Employee.objects.filter(churn_risk__gte=70).count()

        recent_activity = [
            {
                "action": "Connexion",
                "user": u.get_full_name() or u.username,
                "role": u.role,
                "time": u.last_login.isoformat() if u.last_login else None,
            }
            for u in User.objects.filter(last_login__isnull=False)
            .order_by("-last_login")
            .only("first_name", "last_name", "username", "role", "last_login")[:10]
        ]

        return Response(
            {
                "total_users": total_users,
                "active_roles": active_roles,
                "by_role": by_role,
                "total_employees": total_employees,
                "active_employees": active_employees,
                "high_risk_employees": high_risk_employees,
                "recent_activity": recent_activity,
            }
        )
