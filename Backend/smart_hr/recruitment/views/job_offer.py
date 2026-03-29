from rest_framework import filters
from rest_framework import viewsets
from rest_framework.permissions import AllowAny

from smart_hr.recruitment.models import JobOffer
from smart_hr.recruitment.serializers import JobOfferSerializer
from smart_hr.users.permissions import IsRH


class JobOfferViewSet(viewsets.ModelViewSet):
    queryset = JobOffer.objects.all()
    serializer_class = JobOfferSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["title", "department", "description"]

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AllowAny()]
        return [IsRH()]

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
