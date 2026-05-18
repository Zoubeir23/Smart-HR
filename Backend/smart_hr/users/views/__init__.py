from smart_hr.users.views.login import EmailVerifiedLoginView
from smart_hr.users.views.stats import AdminStatsView
from smart_hr.users.views.user import UserDetailView
from smart_hr.users.views.user import UserRedirectView
from smart_hr.users.views.user import UserUpdateView
from smart_hr.users.views.user import user_detail_view
from smart_hr.users.views.user import user_redirect_view
from smart_hr.users.views.user import user_update_view

__all__ = [
    "AdminStatsView",
    "EmailVerifiedLoginView",
    "UserDetailView",
    "UserRedirectView",
    "UserUpdateView",
    "user_detail_view",
    "user_redirect_view",
    "user_update_view",
]
