"""Garde-fou sur l'exposition des médias en production.

Les médias contiennent des données RH hautement sensibles (CV, contrats,
bulletins de paie, pièces d'identité). `ProtectedMediaView` applique le
contrôle d'accès par propriétaire mais lit le disque local : dès qu'un
stockage objet (MinIO/S3) est activé, elle sort du chemin de lecture. La
seule protection restante est alors la signature des URLs, d'où ces tests.
"""

import importlib
import os
from unittest.mock import patch

import pytest

_REQUIRED_PRODUCTION_ENV = {
    "DJANGO_SECRET_KEY": "test-secret-key-for-settings-import",
    "DJANGO_ADMIN_URL": "admin-test/",
    "DATABASE_URL": "sqlite:///test.sqlite3",
    "MINIO_STORAGE_ENABLED": "True",
    "MINIO_ACCESS_KEY": "test-access-key",
    "MINIO_SECRET_KEY": "test-secret-key",
    "MINIO_ENDPOINT_URL": "https://minio.example.com",
    "MINIO_BUCKET_NAME": "smart-hr-test",
}


@pytest.fixture
def production_settings_with_object_storage():
    """Charge `config.settings.production` avec le stockage objet activé."""
    with patch.dict(os.environ, _REQUIRED_PRODUCTION_ENV, clear=False):
        module = importlib.import_module("config.settings.production")
        yield importlib.reload(module)


def test_object_storage_urls_are_signed(production_settings_with_object_storage) -> None:
    """AWS_QUERYSTRING_AUTH=False produirait des URLs permanentes non signées,
    exploitables uniquement si le bucket est en lecture anonyme — soit une
    exposition publique de tous les documents RH."""
    assert production_settings_with_object_storage.AWS_QUERYSTRING_AUTH is True


def test_signed_urls_expire(production_settings_with_object_storage) -> None:
    """Une URL signée doit avoir une durée de vie bornée."""
    expiry_seconds = production_settings_with_object_storage.AWS_QUERYSTRING_EXPIRE
    assert isinstance(expiry_seconds, int)
    assert 0 < expiry_seconds <= 86400


def test_media_url_does_not_expose_public_bucket_prefix(
    production_settings_with_object_storage,
) -> None:
    """Surcharger MEDIA_URL vers le préfixe du bucket fournirait une base
    d'URLs non signées, contournant la signature."""
    media_url = production_settings_with_object_storage.MEDIA_URL
    assert os.environ["MINIO_ENDPOINT_URL"] not in media_url
