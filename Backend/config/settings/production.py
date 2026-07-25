from .base import *  # noqa: F403
from .base import DATABASES
from .base import DEFAULT_FROM_EMAIL
from .base import INSTALLED_APPS
from .base import REDIS_URL
from .base import SENTRY_DSN
from .base import env

# GENERAL
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
SECRET_KEY = env("DJANGO_SECRET_KEY")
# https://docs.djangoproject.com/en/dev/ref/settings/#allowed-hosts
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS", default=["smart-hr.tech", "www.smart-hr.tech", "smarthr.com", "www.smarthr.com"])

# DATABASES
# ------------------------------------------------------------------------------
DATABASES["default"]["CONN_MAX_AGE"] = env.int("CONN_MAX_AGE", default=60)

# CACHES
# ------------------------------------------------------------------------------
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": REDIS_URL,
        "OPTIONS": {
            "CLIENT_CLASS": "django_redis.client.DefaultClient",
            # Mimicking memcache behavior.
            # https://github.com/jazzband/django-redis#memcached-exceptions-behavior
            "IGNORE_EXCEPTIONS": True,
        },
    },
}

# SECURITY
# ------------------------------------------------------------------------------
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
# When DJANGO_SECURE_SSL_REDIRECT=False (HTTP-only VPS), disable HTTPS-only cookies
_ssl_enabled = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)
SESSION_COOKIE_SECURE = _ssl_enabled
CSRF_COOKIE_SECURE = _ssl_enabled
SESSION_COOKIE_NAME = "__Secure-sessionid" if _ssl_enabled else "sessionid"
CSRF_COOKIE_NAME = "__Secure-csrftoken" if _ssl_enabled else "csrftoken"
SECURE_HSTS_SECONDS = env.int("DJANGO_SECURE_HSTS_SECONDS", default=31536000)
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=True,
)
SECURE_HSTS_PRELOAD = env.bool("DJANGO_SECURE_HSTS_PRELOAD", default=True)
SECURE_CONTENT_TYPE_NOSNIFF = env.bool(
    "DJANGO_SECURE_CONTENT_TYPE_NOSNIFF",
    default=True,
)

# STATIC & MEDIA
# ------------------------
MINIO_STORAGE_ENABLED = env.bool("MINIO_STORAGE_ENABLED", default=False)

if MINIO_STORAGE_ENABLED:
    INSTALLED_APPS += ["storages"]

    AWS_ACCESS_KEY_ID = env("MINIO_ACCESS_KEY")
    AWS_SECRET_ACCESS_KEY = env("MINIO_SECRET_KEY")
    AWS_STORAGE_BUCKET_NAME = env("MINIO_BUCKET_NAME", default="smart-hr")
    AWS_S3_ENDPOINT_URL = env("MINIO_ENDPOINT_URL")
    AWS_S3_REGION_NAME = "us-east-1"
    AWS_DEFAULT_ACL = None
    AWS_S3_FILE_OVERWRITE = False

    # URLs signées et expirantes — NE JAMAIS repasser à False.
    #
    # Les médias contiennent des données RH hautement sensibles (CV, contrats,
    # bulletins de paie, pièces d'identité, pièces disciplinaires). `ProtectedMediaView`
    # (voir `smart_hr.core.protected_media`) applique le contrôle d'accès par
    # propriétaire, mais elle lit le disque local : avec un stockage objet, elle
    # est hors du chemin de lecture et ne protège plus rien.
    #
    # Avec AWS_QUERYSTRING_AUTH=False, `file.url` produit des URLs permanentes et
    # non signées, qui n'ont d'intérêt que si le bucket autorise la lecture
    # anonyme — soit une exposition publique de tous les documents RH à qui
    # connaît ou devine l'URL. À True, `file.url` renvoie une URL signée valable
    # AWS_QUERYSTRING_EXPIRE secondes, et le bucket reste privé.
    AWS_QUERYSTRING_AUTH = True
    AWS_QUERYSTRING_EXPIRE = env.int("DJANGO_AWS_QUERYSTRING_EXPIRE", default=3600)

    STORAGES = {
        "default": {
            "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
            "OPTIONS": {
                "location": "media",
            },
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

    # MEDIA_URL n'est volontairement pas surchargé vers le préfixe public du
    # bucket : S3Boto3Storage construit lui-même l'URL signée complète dans
    # `file.url`, et publier ce préfixe donnerait une base d'URLs non signées.

else:
    STORAGES = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
        },
        "staticfiles": {
            "BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage",
        },
    }

# EMAIL
# ------------------------------------------------------------------------------
# DEFAULT_FROM_EMAIL is intentionally NOT overridden here.
# base.py already computes it with a correct fallback chain:
#   DJANGO_DEFAULT_FROM_EMAIL -> EMAIL_HOST_USER -> ""
# Overriding it here with default="" would break that fallback in production.
# https://docs.djangoproject.com/en/dev/ref/settings/#server-email
SERVER_EMAIL = env("DJANGO_SERVER_EMAIL", default=DEFAULT_FROM_EMAIL)
# https://docs.djangoproject.com/en/dev/ref/settings/#email-subject-prefix
EMAIL_SUBJECT_PREFIX = env(
    "DJANGO_EMAIL_SUBJECT_PREFIX",
    default="[Smart HR] ",
)
ACCOUNT_EMAIL_SUBJECT_PREFIX = EMAIL_SUBJECT_PREFIX

# ADMIN
# ------------------------------------------------------------------------------
# Django Admin URL regex.
ADMIN_URL = env("DJANGO_ADMIN_URL")

# Anymail
# ------------------------------------------------------------------------------
# https://anymail.readthedocs.io/en/stable/installation/#installing-anymail
INSTALLED_APPS += ["anymail"]
# https://docs.djangoproject.com/en/dev/ref/settings/#email-backend
# https://anymail.readthedocs.io/en/stable/installation/#anymail-settings-reference
# https://anymail.readthedocs.io/en/stable/esps
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
ANYMAIL = {}


# LOGGING
# ------------------------------------------------------------------------------
# https://docs.djangoproject.com/en/dev/ref/settings/#logging
# See https://docs.djangoproject.com/en/dev/topics/logging for
# more details on how to customize your logging configuration.
# A sample logging configuration. The only tangible logging
# performed by this configuration is to send an email to
# the site admins on every HTTP 500 error when DEBUG=False.
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "filters": {"require_debug_false": {"()": "django.utils.log.RequireDebugFalse"}},
    "formatters": {
        "verbose": {
            "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s",
        },
    },
    "handlers": {
        "mail_admins": {
            "level": "ERROR",
            "filters": ["require_debug_false"],
            "class": "django.utils.log.AdminEmailHandler",
        },
        "console": {
            "level": "DEBUG",
            "class": "logging.StreamHandler",
            "formatter": "verbose",
        },
    },
    "root": {"level": "INFO", "handlers": ["console"]},
    "loggers": {
        "django.request": {
            "handlers": ["mail_admins"],
            "level": "ERROR",
            "propagate": True,
        },
        "django.security.DisallowedHost": {
            "level": "ERROR",
            "handlers": ["console", "mail_admins"],
            "propagate": True,
        },
    },
}


# CORS — allow frontend origin in production
# ------------------------------------------------------------------------------
# nginx proxy makes this unnecessary when using docker-compose.vps.yml,
# but keep it as a fallback for any direct cross-origin access.
CORS_ALLOWED_ORIGINS = env.list(
    "CORS_ALLOWED_ORIGINS",
    default=[],
)

# AI API Keys
# ------------------------------------------------------------------------------
GEMINI_API_KEY = env("GEMINI_API_KEY", default="")
GOOGLE_API_KEY = env("GOOGLE_API_KEY", default=GEMINI_API_KEY)

# Sentry — actif en production uniquement
# ------------------------------------------------------------------------------
if SENTRY_DSN:
    from config.sentry import initialize_sentry

    initialize_sentry(SENTRY_DSN)
