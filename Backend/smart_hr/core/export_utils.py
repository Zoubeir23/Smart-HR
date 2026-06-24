"""Utilitaires pour générer des réponses HTTP CSV et XLSX."""

from __future__ import annotations

import csv
import io


def build_csv_response(rows: list[dict], filename: str):
    """Construit une HttpResponse CSV à partir d'une liste de dicts."""
    from django.http import HttpResponse

    if not rows:
        response = HttpResponse("", content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="{filename}"'
        return response

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
    writer.writeheader()
    writer.writerows(rows)

    response = HttpResponse(output.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def build_xlsx_response(rows: list[dict], filename: str, sheet_name: str = "Export"):
    """Construit une HttpResponse XLSX à partir d'une liste de dicts."""
    import openpyxl
    from django.http import HttpResponse

    workbook = openpyxl.Workbook()
    worksheet = workbook.active
    worksheet.title = sheet_name

    if rows:
        headers = list(rows[0].keys())
        worksheet.append(headers)
        for row in rows:
            worksheet.append([row.get(h, "") for h in headers])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    response = HttpResponse(
        buffer.read(),
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


def export_response(rows: list[dict], filename_base: str, export_format: str, sheet_name: str = "Export"):
    """Route vers CSV ou XLSX selon `export_format` ('csv' ou 'xlsx')."""
    if export_format == "xlsx":
        return build_xlsx_response(rows, f"{filename_base}.xlsx", sheet_name=sheet_name)
    return build_csv_response(rows, f"{filename_base}.csv")
