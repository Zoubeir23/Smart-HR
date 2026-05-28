import logging
from pathlib import Path

from django.conf import settings
from django.http import HttpResponse
from django.template.loader import render_to_string
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action

from smart_hr.personnel.models import Contract
from smart_hr.personnel.serializers import ContractSerializer
from smart_hr.users.permissions import IsRH

logger = logging.getLogger(__name__)


class ContractViewSet(viewsets.ModelViewSet):
    """API CRUD des contrats employés."""

    queryset = Contract.objects.select_related(
        "employee__user",
        "employee__position",
        "employee__department",
    ).all()
    serializer_class = ContractSerializer
    permission_classes = [IsRH]

    def get_queryset(self):
        queryset = super().get_queryset()
        employee_id = self.request.query_params.get("employee")
        if employee_id:
            queryset = queryset.filter(employee_id=employee_id)
        return queryset

    @action(detail=True, methods=["get"], url_path="export_pdf")
    def export_pdf(self, request, pk=None):
        """Génère et retourne le contrat au format PDF via WeasyPrint."""
        import weasyprint

        contract = self.get_object()
        employee = contract.employee

        logo_path = Path(settings.STATICFILES_DIRS[0]) / "images" / "logo.svg"

        context = {
            "contract": contract,
            "employee_full_name": employee.user.get_full_name(),
            "position": employee.position.title if employee.position else "",
            "department": employee.department.name if employee.department else "",
            "salary_formatted": f"{float(contract.salary):,.0f}".replace(",", " "),
            "today": timezone.now().date().strftime("%d/%m/%Y"),
            "logo_path": logo_path.as_uri(),
        }

        html_content = render_to_string("personnel/contract_pdf.html", context, request=request)

        try:
            pdf_bytes = weasyprint.HTML(string=html_content).write_pdf()
        except Exception:
            logger.exception("Échec génération PDF contrat %s", contract.id)
            return HttpResponse("Erreur lors de la génération du PDF.", status=500)

        filename = f"contrat_{employee.user.last_name.lower()}_{contract.id}.pdf"
        response = HttpResponse(pdf_bytes, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response
