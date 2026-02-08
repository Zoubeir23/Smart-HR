"""
Configuration centralisée pour les agents IA.
Utilise python-decouple pour charger les clés API depuis le fichier .env.
"""

from decouple import config
from django.conf import settings


# ─── OpenAI ──────────────────────────────────────────────────────────────────
OPENAI_API_KEY = config('OPENAI_API_KEY', default='')

# ─── Qdrant (base vectorielle) ───────────────────────────────────────────────
QDRANT_URL = config('QDRANT_URL', default='http://localhost:6333')
QDRANT_API_KEY = config('QDRANT_API_KEY', default='')

# ─── Email (Gmail) ───────────────────────────────────────────────────────────
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')

# ─── Zoom (réutilise les valeurs de settings si disponibles) ─────────────────
ZOOM_ACCOUNT_ID = config('ZOOM_ACCOUNT_ID', default='')
ZOOM_CLIENT_ID = getattr(settings, 'ZOOM_CLIENT_ID', '') or config('ZOOM_CLIENT_ID', default='')
ZOOM_CLIENT_SECRET = getattr(settings, 'ZOOM_CLIENT_SECRET', '') or config('ZOOM_CLIENT_SECRET', default='')


# ─── Fonctions utilitaires ───────────────────────────────────────────────────

def is_openai_configured() -> bool:
    """Vérifie si la clé OpenAI est configurée."""
    return bool(OPENAI_API_KEY)


def is_zoom_configured() -> bool:
    """Vérifie si les identifiants Zoom sont configurés."""
    return bool(ZOOM_ACCOUNT_ID and ZOOM_CLIENT_ID and ZOOM_CLIENT_SECRET)


def is_email_configured() -> bool:
    """Vérifie si les identifiants email sont configurés."""
    return bool(EMAIL_HOST_USER and EMAIL_HOST_PASSWORD)
