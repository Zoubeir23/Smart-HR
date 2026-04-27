import logging

from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.users.models import User
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class AdminStatsView(APIView):
    """
    GET /api/v1/auth/admin/stats/
    Retourne des statistiques globales de la plateforme.
    Accessible aux RH et Admin.
    """

    permission_classes = [IsRH]

    def get(self, request):
        """Retourne un agrégat des indicateurs globaux utiles au pilotage RH."""
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
        total_employees = Employee.objects.count()
        active_employees = Employee.objects.filter(status="active").count()
        high_risk_employees = Employee.objects.filter(churn_risk__gte=70).count()

        recent_logins = (
            User.objects.exclude(last_login=None)
            .order_by("-last_login")
            .values("email", "first_name", "last_name", "last_login")[:10]
        )
        recent_activity = [
            {
                "action": "Connexion",
                "user": f"{u['first_name']} {u['last_name']}".strip() or u["email"],
                "time": u["last_login"].isoformat() if u["last_login"] else None,
            }
            for u in recent_logins
        ]

        active_roles = len(
            [role for role, count in by_role.items() if count > 0]
        )

        return Response(
            {
                "total_users": total_users,
                "by_role": by_role,
                "total_employees": total_employees,
                "active_employees": active_employees,
                "high_risk_employees": high_risk_employees,
                "recent_activity": recent_activity,
                "active_roles": active_roles,
            }
        )
