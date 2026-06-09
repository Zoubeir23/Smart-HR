from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include
from django.urls import path
from django.views import defaults as default_views
from django.views.generic import TemplateView
from drf_spectacular.views import SpectacularAPIView
from drf_spectacular.views import SpectacularRedocView
from drf_spectacular.views import SpectacularSwaggerView

from smart_hr.core.protected_media import ProtectedMediaView
from smart_hr.core.sitemap import sitemap_view
from smart_hr.users.views import AdminStatsView
from smart_hr.users.views import AdminUserManagementView
from smart_hr.users.views import EmailVerifiedLoginView
from smart_hr.users.views.account import AccountDeleteView
from smart_hr.users.views.account import PersonalDataExportView
from smart_hr.users.views.registration import CandidateRegisterView
from smart_hr.users.views.registration import ResendOTPView
from smart_hr.users.views.registration import VerifyOTPView


def health_check(request):
    """Endpoint de santé pour monitoring (UptimeRobot, cron)."""
    from django.db import connection

    try:
        connection.ensure_connection()
        db_ok = True
    except Exception:
        db_ok = False

    payload = {"status": "ok" if db_ok else "degraded", "database": db_ok}
    http_status = 200 if db_ok else 503
    return JsonResponse(payload, status=http_status)


urlpatterns = [
    path("health/", health_check, name="health-check"),
    path("sitemap.xml", sitemap_view, name="sitemap"),
    path("", TemplateView.as_view(template_name="pages/home.html"), name="home"),
    path(
        "about/",
        TemplateView.as_view(template_name="pages/about.html"),
        name="about",
    ),
    # Django Admin, use {% url 'admin:index' %}
    path(settings.ADMIN_URL, admin.site.urls),
    # User management (Django views classiques)
    path("users/", include("smart_hr.users.urls", namespace="users")),
    path("accounts/", include("allauth.urls")),
    # API v1 — Authentification (dj-rest-auth + JWT)
    # Login avec vérification OTP pour les candidats (remplace le login dj_rest_auth)
    path("api/v1/auth/login/", EmailVerifiedLoginView.as_view(), name="email-verified-login"),
    path("api/v1/auth/", include("dj_rest_auth.urls")),
    path("api/v1/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/v1/auth/admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("api/v1/auth/admin/users/", AdminUserManagementView.as_view(), name="admin-users-list"),
    path("api/v1/auth/admin/users/<int:user_id>/", AdminUserManagementView.as_view(), name="admin-users-detail"),
    path(
        "api/v1/auth/register/candidate/",
        CandidateRegisterView.as_view(),
        name="candidate-register",
    ),
    path("api/v1/auth/verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("api/v1/auth/resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
    # RGPD — Droit à l'oubli et portabilité
    path("api/v1/auth/account/delete/", AccountDeleteView.as_view(), name="account-delete"),
    path("api/v1/auth/account/export/", PersonalDataExportView.as_view(), name="account-export"),
    # API v1 — Core (notifications)
    path("api/v1/", include("smart_hr.core.urls")),
    # API v1 — Modules métier
    path("api/v1/personnel/", include("smart_hr.personnel.urls")),
    path("api/v1/conge/", include("smart_hr.conge.urls")),
    path("api/v1/tache/", include("smart_hr.tache.urls")),
    path("api/v1/presence/", include("smart_hr.presence.urls")),
    path("api/v1/paiement/", include("smart_hr.paiement.urls")),
    path("api/v1/document/", include("smart_hr.document.urls")),
    path("api/v1/formation/", include("smart_hr.formation.urls")),
    path("api/v1/recruitment/", include("smart_hr.recruitment.urls")),
    path("api/v1/ai/", include("smart_hr.ai.urls")),
    path("api/v1/ai-engine/", include("smart_hr.ai_engine.urls")),
    path("api/v1/agents/", include("smart_hr.ai_agents.urls")),
    # Media files — accès protégé par JWT
    path("media/<path:path>", ProtectedMediaView.as_view(), name="protected-media"),
    # OpenAPI / Swagger — documentation interactive
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]


if settings.DEBUG:
    # This allows the error pages to be debugged during development, just visit
    # these url in browser to see how these error pages look like.
    urlpatterns += [
        path(
            "400/",
            default_views.bad_request,
            kwargs={"exception": Exception("Bad Request!")},
        ),
        path(
            "403/",
            default_views.permission_denied,
            kwargs={"exception": Exception("Permission Denied")},
        ),
        path(
            "404/",
            default_views.page_not_found,
            kwargs={"exception": Exception("Page not Found")},
        ),
        path("500/", default_views.server_error),
    ]
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
            *urlpatterns,
        ]
