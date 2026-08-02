from __future__ import annotations

from django.db.models import Q
from rest_framework.generics import ListAPIView
from rest_framework.permissions import IsAuthenticated

from smart_hr.messaging.contact_rules import allowed_contacts_queryset
from smart_hr.messaging.serializers import ContactSerializer


class ContactListView(ListAPIView):
    """Annuaire des interlocuteurs qu'un utilisateur a le droit de contacter.

    Le filtrage par rôle est appliqué côté serveur : un candidat n'obtient
    jamais la liste des employés, même en forgeant la requête.
    """

    serializer_class = ContactSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = allowed_contacts_queryset(self.request.user)

        role = self.request.query_params.get("role")
        if role:
            queryset = queryset.filter(role=role)

        search_term = self.request.query_params.get("search", "").strip()
        if search_term:
            queryset = queryset.filter(
                Q(first_name__icontains=search_term)
                | Q(last_name__icontains=search_term)
                | Q(email__icontains=search_term),
            )

        return queryset
