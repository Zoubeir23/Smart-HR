import logging

from dj_rest_auth.views import LoginView
from rest_framework import status
from rest_framework.response import Response

from smart_hr.core.throttles import LoginRateThrottle

logger = logging.getLogger(__name__)


class EmailVerifiedLoginView(LoginView):
    """
    Extension de LoginView qui bloque la connexion des candidats non vérifiés.
    Les autres rôles (ADMIN, RH, EMPLOYEE) sont exemptés : leur compte est créé
    par un admin et n'a pas besoin de vérification OTP.
    """

    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code != status.HTTP_200_OK:
            return response

        user = self.user
        if user and user.role == "CANDIDATE" and not user.is_email_verified:
            return Response(
                {
                    "detail": ("Votre email n'est pas encore vérifié. Veuillez saisir le code OTP reçu par email."),
                    "code": "email_not_verified",
                    "email": user.email,
                },
                status=status.HTTP_403_FORBIDDEN,
            )

        return response
