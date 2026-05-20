from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "smart_hr.core"
    verbose_name = "Core"

    def ready(self) -> None:
        import smart_hr.core.signals  # noqa: F401
