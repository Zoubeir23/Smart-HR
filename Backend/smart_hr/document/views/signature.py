from __future__ import annotations

from django.db.models import Q
from django.utils import timezone
from rest_framework import mixins
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.document.models import Signature
from smart_hr.document.models import SignatureRequest
from smart_hr.document.serializers import SignatureRequestSerializer
from smart_hr.document.serializers import SignatureSerializer
from smart_hr.users.permissions import IsRH


class SignatureViewSet(
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Signature électronique personnelle de l'utilisateur connecté (une seule
    par utilisateur — créée ou remplacée via `me/`)."""

    serializer_class = SignatureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Signature.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get", "put"], url_path="me")
    def me(self, request):
        """GET /signatures/me/ — récupère sa signature. PUT — la crée ou la remplace."""
        signature = Signature.objects.filter(user=request.user).first()

        if request.method == "GET":
            if signature is None:
                return Response(status=status.HTTP_404_NOT_FOUND)
            return Response(self.get_serializer(signature).data)

        serializer = self.get_serializer(instance=signature, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)
        return Response(serializer.data, status=status.HTTP_200_OK if signature else status.HTTP_201_CREATED)


class SignatureRequestViewSet(viewsets.ModelViewSet):
    """Demandes de signature électronique de documents."""

    serializer_class = SignatureRequestSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        base = SignatureRequest.objects.select_related("document", "signatory", "requested_by")
        if user.role in ["ADMIN", "RH"]:
            return base
        return base.filter(Q(signatory=user) | Q(requested_by=user))

    def get_permissions(self):
        if self.action == "destroy":
            return [IsRH()]
        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(requested_by=self.request.user)

    @action(detail=True, methods=["post"], url_path="sign")
    def sign(self, request, pk=None):
        """POST /signature-requests/{id}/sign/ — signe la demande avec la signature enregistrée du signataire."""
        signature_request = self.get_object()

        if signature_request.signatory_id != request.user.id:
            return Response({"detail": "Seul le signataire désigné peut signer cette demande."}, status=status.HTTP_403_FORBIDDEN)
        if signature_request.status != SignatureRequest.Status.PENDING:
            return Response({"detail": "Cette demande a déjà été traitée."}, status=status.HTTP_400_BAD_REQUEST)
        if not Signature.objects.filter(user=request.user).exists():
            return Response(
                {"detail": "Vous devez d'abord déposer votre signature électronique (POST /signatures/me/)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        signature_request.status = SignatureRequest.Status.SIGNED
        signature_request.signed_at = timezone.now()
        signature_request.save(update_fields=["status", "signed_at", "updated_at"])
        return Response(self.get_serializer(signature_request).data)

    @action(detail=True, methods=["post"], url_path="decline")
    def decline(self, request, pk=None):
        """POST /signature-requests/{id}/decline/ — le signataire refuse de signer."""
        signature_request = self.get_object()

        if signature_request.signatory_id != request.user.id:
            return Response(
                {"detail": "Seul le signataire désigné peut refuser cette demande."}, status=status.HTTP_403_FORBIDDEN
            )
        if signature_request.status != SignatureRequest.Status.PENDING:
            return Response({"detail": "Cette demande a déjà été traitée."}, status=status.HTTP_400_BAD_REQUEST)

        signature_request.status = SignatureRequest.Status.DECLINED
        signature_request.comment = request.data.get("comment", signature_request.comment)
        signature_request.save(update_fields=["status", "comment", "updated_at"])
        return Response(self.get_serializer(signature_request).data)
