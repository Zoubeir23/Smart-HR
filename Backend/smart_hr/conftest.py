import pytest
from django.core.cache import cache

from smart_hr.users.models import User
from smart_hr.users.tests.factories import UserFactory


@pytest.fixture(autouse=True)
def _media_storage(settings, tmpdir) -> None:
    settings.MEDIA_ROOT = tmpdir.strpath


@pytest.fixture(autouse=True)
def _clear_throttle_cache() -> None:
    """Le cache de rate-limiting DRF (ex: AILLMUserThrottle) n'est pas couvert par
    le rollback transactionnel de chaque test. Comme les PK d'utilisateurs sont
    réutilisés d'un test à l'autre, un nouvel utilisateur peut hériter du
    compteur de requêtes d'un utilisateur précédent portant le même PK,
    déclenchant un 429 imprévisible selon l'ordre d'exécution des tests."""
    cache.clear()


@pytest.fixture
def user(db) -> User:
    return UserFactory.create()
