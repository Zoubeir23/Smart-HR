from __future__ import annotations

import csv
import io

import openpyxl
from django.http import HttpResponse

from smart_hr.core.export_utils import build_csv_response
from smart_hr.core.export_utils import build_multi_sheet_xlsx_response
from smart_hr.core.export_utils import build_xlsx_response
from smart_hr.core.export_utils import export_response


class TestBuildCsvResponse:
    def test_returns_http_response(self):
        response = build_csv_response([{"name": "Alice", "age": 30}], "export.csv")
        assert isinstance(response, HttpResponse)

    def test_content_type_is_csv(self):
        response = build_csv_response([{"name": "Alice"}], "export.csv")
        assert "text/csv" in response["Content-Type"]

    def test_content_disposition_contains_filename(self):
        response = build_csv_response([{"name": "Alice"}], "my_export.csv")
        assert "my_export.csv" in response["Content-Disposition"]

    def test_csv_contains_header_row(self):
        response = build_csv_response([{"prenom": "Alice", "age": 30}], "export.csv")
        content = response.content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
        assert "prenom" in reader.fieldnames
        assert "age" in reader.fieldnames

    def test_csv_contains_data_rows(self):
        rows = [{"nom": "Alice"}, {"nom": "Bob"}]
        response = build_csv_response(rows, "export.csv")
        content = response.content.decode("utf-8")
        reader = csv.DictReader(io.StringIO(content))
        data = list(reader)
        assert len(data) == 2
        assert data[0]["nom"] == "Alice"
        assert data[1]["nom"] == "Bob"

    def test_empty_rows_returns_empty_body(self):
        response = build_csv_response([], "empty.csv")
        assert response.content == b""
        assert "empty.csv" in response["Content-Disposition"]


class TestBuildXlsxResponse:
    def test_returns_http_response(self):
        response = build_xlsx_response([{"col": "val"}], "export.xlsx")
        assert isinstance(response, HttpResponse)

    def test_content_type_is_xlsx(self):
        response = build_xlsx_response([{"col": "val"}], "export.xlsx")
        assert "spreadsheetml" in response["Content-Type"]

    def test_content_disposition_contains_filename(self):
        response = build_xlsx_response([{"col": "val"}], "mon_export.xlsx")
        assert "mon_export.xlsx" in response["Content-Disposition"]

    def test_xlsx_contains_data(self):
        rows = [{"prenom": "Alice", "score": 95}, {"prenom": "Bob", "score": 82}]
        response = build_xlsx_response(rows, "export.xlsx", sheet_name="Résultats")
        workbook = openpyxl.load_workbook(io.BytesIO(response.content))
        worksheet = workbook.active
        assert worksheet.title == "Résultats"
        values = [[cell.value for cell in row] for row in worksheet.iter_rows()]
        assert values[0] == ["prenom", "score"]
        assert values[1] == ["Alice", 95]
        assert values[2] == ["Bob", 82]

    def test_empty_rows_produces_valid_xlsx(self):
        response = build_xlsx_response([], "empty.xlsx")
        workbook = openpyxl.load_workbook(io.BytesIO(response.content))
        assert workbook.active is not None


class TestBuildMultiSheetXlsxResponse:
    def test_returns_http_response_with_xlsx_content_type(self):
        response = build_multi_sheet_xlsx_response({"Sheet1": [{"col": "val"}]}, "export.xlsx")
        assert isinstance(response, HttpResponse)
        assert "spreadsheetml" in response["Content-Type"]

    def test_content_disposition_contains_filename(self):
        response = build_multi_sheet_xlsx_response({"Sheet1": [{"col": "val"}]}, "analytics.xlsx")
        assert "analytics.xlsx" in response["Content-Disposition"]

    def test_creates_one_sheet_per_key_with_correct_data(self):
        sheets = {
            "Effectifs": [{"departement": "Tech", "count": 5}],
            "Formations": [{"titre": "Django", "cout": 200000}],
        }
        response = build_multi_sheet_xlsx_response(sheets, "export.xlsx")
        workbook = openpyxl.load_workbook(io.BytesIO(response.content))

        assert workbook.sheetnames == ["Effectifs", "Formations"]
        effectifs_values = [[cell.value for cell in row] for row in workbook["Effectifs"].iter_rows()]
        assert effectifs_values[0] == ["departement", "count"]
        assert effectifs_values[1] == ["Tech", 5]

    def test_empty_sheet_rows_produces_valid_sheet(self):
        response = build_multi_sheet_xlsx_response({"Vide": []}, "export.xlsx")
        workbook = openpyxl.load_workbook(io.BytesIO(response.content))
        assert "Vide" in workbook.sheetnames

    def test_truncates_sheet_names_longer_than_31_characters(self):
        long_name = "Un nom d'onglet vraiment beaucoup trop long pour Excel"
        response = build_multi_sheet_xlsx_response({long_name: [{"col": "val"}]}, "export.xlsx")
        workbook = openpyxl.load_workbook(io.BytesIO(response.content))
        assert len(workbook.sheetnames[0]) <= 31


class TestExportResponse:
    def test_csv_format_returns_csv(self):
        response = export_response([{"col": "val"}], "export", "csv")
        assert "text/csv" in response["Content-Type"]
        assert "export.csv" in response["Content-Disposition"]

    def test_xlsx_format_returns_xlsx(self):
        response = export_response([{"col": "val"}], "export", "xlsx")
        assert "spreadsheetml" in response["Content-Type"]
        assert "export.xlsx" in response["Content-Disposition"]

    def test_unknown_format_defaults_to_csv(self):
        response = export_response([{"col": "val"}], "export", "json")
        assert "text/csv" in response["Content-Type"]
