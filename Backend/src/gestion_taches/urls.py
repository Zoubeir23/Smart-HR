from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth
    path('api/auth/', include('utilisateur.urls')),

    # Core HR
    path('api/personnel/', include('personnel.urls')),
    path('api/conges/', include('conge.urls')),
    path('api/taches/', include('tache.urls')),
    path('api/presences/', include('presence.urls')),
    path('api/paiements/', include('paiement.urls')),
    path('api/documents/', include('document.urls')),
    path('api/formations/', include('formation.urls')),

    # AI
    path('api/genai/', include('genai.urls')),

    # Recruitment & AI Engine
    path('api/recruitment/', include('recruitment.urls')),
    path('api/ai-engine/', include('ai_engine.urls')),
    path('api/agents/', include('ai_agents.urls')),
]

urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
