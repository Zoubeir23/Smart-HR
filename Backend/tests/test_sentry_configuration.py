from unittest.mock import call, patch

import pytest


@pytest.fixture()
def valid_dsn() -> str:
    return "https://abc123@o000000.ingest.de.sentry.io/000000"


def test_initialize_sentry_calls_sdk_init_with_correct_params(valid_dsn: str) -> None:
    with patch("sentry_sdk.init") as mock_init:
        from config.sentry import initialize_sentry

        initialize_sentry(valid_dsn)

        mock_init.assert_called_once_with(
            dsn=valid_dsn,
            send_default_pii=True,
            traces_sample_rate=1.0,
            profile_session_sample_rate=1.0,
            profile_lifecycle="trace",
            _experiments={"enable_logs": True},
        )


def test_initialize_sentry_passes_dsn_through(valid_dsn: str) -> None:
    with patch("sentry_sdk.init") as mock_init:
        from config.sentry import initialize_sentry

        initialize_sentry(valid_dsn)

        actual_dsn = mock_init.call_args[1]["dsn"]
        assert actual_dsn == valid_dsn


def test_initialize_sentry_enables_pii(valid_dsn: str) -> None:
    with patch("sentry_sdk.init") as mock_init:
        from config.sentry import initialize_sentry

        initialize_sentry(valid_dsn)

        assert mock_init.call_args[1]["send_default_pii"] is True


def test_initialize_sentry_full_traces_sample_rate(valid_dsn: str) -> None:
    with patch("sentry_sdk.init") as mock_init:
        from config.sentry import initialize_sentry

        initialize_sentry(valid_dsn)

        assert mock_init.call_args[1]["traces_sample_rate"] == 1.0


def test_initialize_sentry_enables_logs_experiment(valid_dsn: str) -> None:
    with patch("sentry_sdk.init") as mock_init:
        from config.sentry import initialize_sentry

        initialize_sentry(valid_dsn)

        experiments = mock_init.call_args[1]["_experiments"]
        assert experiments.get("enable_logs") is True


def test_initialize_sentry_called_once_per_invocation(valid_dsn: str) -> None:
    with patch("sentry_sdk.init") as mock_init:
        from config.sentry import initialize_sentry

        initialize_sentry(valid_dsn)

        assert mock_init.call_count == 1
