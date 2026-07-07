import datetime
import logging
import re

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import filters
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from smart_hr.paiement.models import BulletinPaie
from smart_hr.paiement.serializers import BulletinPaieSerializer
from smart_hr.paiement.services.bulletin_calculator import emettre_bulletin
from smart_hr.personnel.models import Employee
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class BulletinPaieViewSet(viewsets.ReadOnlyModelViewSet):
    """Bulletins de paie générés par le moteur de calcul — lecture + export PDF."""

    serializer_class = BulletinPaieSerializer
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["periode", "net_a_payer", "statut"]
    ordering = ["-periode"]

    def get_queryset(self):
        user = self.request.user
        qs = BulletinPaie.objects.select_related(
            "employee__user",
            "employee__department",
            "employee__position",
            "employee__pays",
        ).prefetch_related("lignes")

        if user.role in ["ADMIN", "RH"]:
            employee_id = self.request.query_params.get("employee_id")
            periode = self.request.query_params.get("periode")
            statut = self.request.query_params.get("statut")
            if employee_id:
                qs = qs.filter(employee_id=employee_id)
            if periode:
                qs = qs.filter(periode__startswith=periode)
            if statut:
                qs = qs.filter(statut=statut)
            return qs

        return qs.filter(employee__user=user)

    def get_permissions(self):
        if self.action in ("list", "generer"):
            return [IsRH()]
        return [IsAuthenticated()]

    @action(detail=False, methods=["post"], url_path="generer")
    def generer(self, request):
        """
        POST /api/v1/paiement/bulletins/generer/
        Body: { "employee_id": <int>, "periode": "YYYY-MM-DD" }
        Calcule et persiste un bulletin de paie via le moteur multi-pays
        (smart_hr.paiement.services.bulletin_calculator). Réservé RH/Admin.
        """
        employee_id = request.data.get("employee_id")
        periode_str = request.data.get("periode")
        if not employee_id or not periode_str:
            return Response(
                {"detail": "Les champs 'employee_id' et 'periode' sont requis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        employee = get_object_or_404(Employee, pk=employee_id)

        try:
            periode = datetime.date.fromisoformat(periode_str)
        except ValueError:
            return Response(
                {"detail": "Le champ 'periode' doit être une date au format YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            bulletin = emettre_bulletin(employee, periode)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(bulletin)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        """Génère et retourne le bulletin de paie au format PDF via WeasyPrint."""
        import weasyprint

        bulletin = self.get_object()
        employee = bulletin.employee

        lignes_gains = [lg for lg in bulletin.lignes.all() if lg.nature == "GAIN"]
        lignes_retenues = [lg for lg in bulletin.lignes.all() if lg.nature == "RETENUE"]
        lignes_info = [lg for lg in bulletin.lignes.all() if lg.nature == "INFO"]

        context = {
            "bulletin": bulletin,
            "employee_full_name": employee.user.get_full_name(),
            "employee_matricule": employee.matricule or "",
            "position": employee.position.title if employee.position else "",
            "department": employee.department.name if employee.department else "",
            "pays_nom": employee.pays.nom if employee.pays else "",
            "devise": employee.pays.devise if employee.pays else "FCFA",
            "hire_date": employee.hire_date.strftime("%d/%m/%Y") if employee.hire_date else "",
            "periode": bulletin.periode,
            "lignes_gains": lignes_gains,
            "lignes_retenues": lignes_retenues,
            "lignes_info": lignes_info,
            "today": timezone.now().date().strftime("%d/%m/%Y"),
        }

        html_content = render_to_string("paiement/bulletin_paie_pdf.html", context, request=request)

        try:
            pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
        except Exception:
            logger.exception("Échec génération PDF bulletin %s", bulletin.id)
            return Response(
                {"detail": "Erreur lors de la génération du PDF. Réessayez plus tard."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        safe_name = re.sub(r"[^\w\-]", "_", employee.user.last_name.lower())
        periode_str = bulletin.periode.strftime("%Y-%m")
        filename = f"bulletin_{safe_name}_{periode_str}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
