from unittest.mock import patch

import pytest

from config.sentry import initialize_sentry


@pytest.fixture()
def valid_dsn() -> str:
    return "https://abc123@o000000.ingest.de.sentry.io/000000"


def test_initialize_sentry_calls_sdk_init_with_correct_params(valid_dsn: str) -> None:
    with patch("config.sentry.sentry_sdk.init") as mock_init:
        initialize_sentry(valid_dsn)

        mock_init.assert_called_once_with(
            dsn=valid_dsn,
            send_default_pii=True,
            traces_sample_rate=1.0,
            profile_session_sample_rate=1.0,
            profile_lifecycle="trace",
            _experiments={"enable_logs": True},
        )


def test_initialize_sentry_with_empty_dsn_still_calls_init() -> None:
    with patch("config.sentry.sentry_sdk.init") as mock_init:
        initialize_sentry("")

        mock_init.assert_called_once_with(
            dsn="",
            send_default_pii=True,
            traces_sample_rate=1.0,
            profile_session_sample_rate=1.0,
            profile_lifecycle="trace",
            _experiments={"enable_logs": True},
        )
