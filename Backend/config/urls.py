from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include
from django.urls import path
from django.views import defaults as default_views
from django.views.generic import TemplateView

from smart_hr.users.views import AdminStatsView
from smart_hr.users.views.registration import CandidateRegisterView
from smart_hr.users.views.registration import ResendOTPView
from smart_hr.users.views.registration import VerifyOTPView

urlpatterns = [
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
    path("api/v1/auth/", include("dj_rest_auth.urls")),
    path("api/v1/auth/registration/", include("dj_rest_auth.registration.urls")),
    path("api/v1/auth/admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    path("api/v1/auth/register/candidate/", CandidateRegisterView.as_view(), name="candidate-register"),
    path("api/v1/auth/verify-otp/", VerifyOTPView.as_view(), name="verify-otp"),
    path("api/v1/auth/resend-otp/", ResendOTPView.as_view(), name="resend-otp"),
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
    # Media files
    *static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT),
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
