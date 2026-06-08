from allauth.account.utils import user_pk_to_url_str
from allauth.utils import build_absolute_uri
from dj_rest_auth.serializers import PasswordResetSerializer as BasePasswordResetSerializer
from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from smart_hr.users.models import User


def frontend_password_reset_url_generator(request, user, temp_key):
    """Génère le lien de reset mot de passe pointant vers le frontend React."""
    uid = user_pk_to_url_str(user)
    frontend_url = getattr(settings, "SITE_URL", build_absolute_uri(request, "/"))
    confirm_path = getattr(
        settings,
        "REST_AUTH",
        {},
    ).get("PASSWORD_RESET_CONFIRM_URL", "reset-password/{uid}/{token}/")
    path = confirm_path.format(uid=uid, token=temp_key)
    return f"{frontend_url.rstrip('/')}/{path}"


class AdminUserCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de comptes internes par l'admin (sans mot de passe)."""

    class Meta:
        model = User
        fields = ["username", "email", "first_name", "last_name", "role", "tel"]

    def validate_email(self, value: str) -> str:
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value.lower()


class PasswordResetSerializer(BasePasswordResetSerializer):
    """Surchage pour générer le lien de reset vers le frontend (pas une URL Django)."""

    def get_email_options(self) -> dict:
        return {"url_generator": frontend_password_reset_url_generator}


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "email", "first_name", "last_name", "role", "tel"]
        read_only_fields = ["id"]


class UserRegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=12)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "tel",
            "password",
            "password2",
        ]

    def validate_email(self, value: str) -> str:
        existing_user = User.objects.filter(email__iexact=value).first()
        if existing_user and existing_user.is_email_verified:
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value.lower()

    def validate(self, data):
        if data["password"] != data["password2"]:
            raise serializers.ValidationError(
                {"password": "Les mots de passe ne correspondent pas."},
            )
        try:
            validate_password(data["password"])
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return data

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user
