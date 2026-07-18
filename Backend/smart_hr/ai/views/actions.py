from __future__ import annotations

from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from smart_hr.ai.actions import list_supported_actions_for_role


class SupportedActionsView(APIView):
    """
    GET /api/v1/ai/actions/

    Liste les intents actionnables du chat IA visibles pour le rôle de
    l'utilisateur connecté (ex: un employé voit 'leave_request' mais pas
    'onboarding_creation') — permet au frontend de construire une aide
    contextuelle dynamique plutôt qu'une liste figée en dur.
    """

    permission_classes = [IsAuthenticated]

    def get(self, request):
        role = getattr(request.user, "role", "")
        return Response({"actions": list_supported_actions_for_role(role)})
