from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser

from utilisateur.permissions import IsRH, IsCandidate
from .models import JobOffer, Application
from .serializers import (
    JobOfferListSerializer,
    JobOfferCreateSerializer,
    ApplicationListSerializer,
    ApplicationCreateSerializer,
)


class JobOfferViewSet(viewsets.ModelViewSet):
    queryset = JobOffer.objects.all()
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ('create', 'update', 'partial_update'):
            return JobOfferCreateSerializer
        return JobOfferListSerializer

    def get_permissions(self):
        if self.action in ('create', 'update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        stat = self.request.query_params.get('status')
        if stat:
            qs = qs.filter(status=stat)
        # Candidates only see open offers
        if self.request.user.role == 'CANDIDATE':
            qs = qs.filter(status='open')
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)


class ApplicationViewSet(viewsets.ModelViewSet):
    queryset = Application.objects.select_related('job_offer', 'candidate').all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        if self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationListSerializer

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), IsCandidate()]
        if self.action in ('update', 'partial_update', 'destroy'):
            return [IsAuthenticated(), IsRH()]
        return [IsAuthenticated()]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        # Candidates see only their own applications
        if user.role == 'CANDIDATE':
            qs = qs.filter(candidate=user)
        # Filter by job_offer or status
        job = self.request.query_params.get('job_offer')
        stat = self.request.query_params.get('status')
        if job:
            qs = qs.filter(job_offer_id=job)
        if stat:
            qs = qs.filter(status=stat)
        return qs

    @action(detail=True, methods=['patch'], permission_classes=[IsAuthenticated, IsRH])
    def update_status(self, request, pk=None):
        application = self.get_object()
        new_status = request.data.get('status')
        if new_status not in dict(Application.Status.choices):
            return Response({'detail': 'Statut invalide.'}, status=status.HTTP_400_BAD_REQUEST)
        application.status = new_status
        application.save()
        return Response(ApplicationListSerializer(application).data)
