"""Import en masse de fiches employés depuis un fichier CSV ou XLSX.

Traitement ligne par ligne, tolérant aux erreurs individuelles : une ligne
invalide est rapportée dans `errors` sans bloquer les lignes suivantes.
Chaque ligne valide crée un compte utilisateur (mot de passe temporaire
envoyé par email, même flux que la création unitaire) et sa fiche employé.
"""

from __future__ import annotations

import datetime
import logging
import secrets
from dataclasses import dataclass
from dataclasses import field
from decimal import Decimal
from decimal import InvalidOperation

from django.db import transaction
from django.utils.text import slugify

from smart_hr.core.email_service import send_employee_credentials_email
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.users.models import User

logger = logging.getLogger(__name__)

REQUIRED_COLUMNS = {"email", "prenom", "nom", "departement", "date_embauche", "salaire"}
TEMPLATE_COLUMNS = ["email", "prenom", "nom", "departement", "poste", "date_embauche", "salaire", "statut"]


@dataclass
class RowError:
    row: int
    email: str
    reason: str


@dataclass
class BulkImportResult:
    created: int = 0
    total_rows: int = 0
    errors: list[RowError] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {
            "created": self.created,
            "total_rows": self.total_rows,
            "errors": [{"row": e.row, "email": e.email, "reason": e.reason} for e in self.errors],
        }


def _generate_unique_username(first_name: str, last_name: str) -> str:
    base = slugify(f"{first_name}.{last_name}") or "employe"
    username = base
    suffix = 1
    while User.objects.filter(username=username).exists():
        suffix += 1
        username = f"{base}{suffix}"
    return username


def _clean(row, column: str) -> str:
    value = row.get(column, "")
    if value is None:
        return ""
    return str(value).strip()


def import_employees_from_dataframe(dataframe) -> BulkImportResult:
    """Traite un DataFrame pandas (une ligne = un employé) et retourne le bilan."""
    result = BulkImportResult(total_rows=len(dataframe))

    for index, row in dataframe.iterrows():
        row_number = index + 2  # ligne 1 = en-tête, DataFrame 0-indexé
        email = _clean(row, "email")
        prenom = _clean(row, "prenom")
        nom = _clean(row, "nom")
        departement_name = _clean(row, "departement")
        poste_title = _clean(row, "poste")
        date_embauche_str = _clean(row, "date_embauche")
        salaire_str = _clean(row, "salaire")
        statut = _clean(row, "statut") or Employee.Status.ACTIVE

        if not email or not prenom or not nom or not departement_name or not date_embauche_str or not salaire_str:
            result.errors.append(
                RowError(
                    row_number,
                    email,
                    "Champs requis manquants (email, prenom, nom, departement, date_embauche, salaire).",
                )
            )
            continue

        if User.objects.filter(email__iexact=email).exists():
            result.errors.append(RowError(row_number, email, "Un compte avec cet email existe déjà."))
            continue

        department = Department.objects.filter(name__iexact=departement_name).first()
        if department is None:
            result.errors.append(RowError(row_number, email, f"Département '{departement_name}' introuvable."))
            continue

        position = None
        if poste_title:
            position = Position.objects.filter(title__iexact=poste_title).first()
            if position is None:
                result.errors.append(RowError(row_number, email, f"Poste '{poste_title}' introuvable."))
                continue

        try:
            hire_date = datetime.date.fromisoformat(date_embauche_str)
        except ValueError:
            result.errors.append(RowError(row_number, email, "date_embauche doit être au format YYYY-MM-DD."))
            continue

        try:
            salary = Decimal(salaire_str)
        except InvalidOperation:
            result.errors.append(RowError(row_number, email, "salaire doit être un nombre."))
            continue

        if statut not in Employee.Status.values:
            valeurs = ", ".join(Employee.Status.values)
            result.errors.append(RowError(row_number, email, f"statut '{statut}' invalide (valeurs possibles : {valeurs})."))
            continue

        try:
            with transaction.atomic():
                username = _generate_unique_username(prenom, nom)
                temp_password = secrets.token_urlsafe(10)
                new_user = User.objects.create(
                    username=username,
                    email=email,
                    first_name=prenom,
                    last_name=nom,
                    role=User.Role.EMPLOYEE,
                    is_email_verified=True,
                )
                new_user.set_password(temp_password)
                new_user.save(update_fields=["password"])

                Employee.objects.create(
                    user=new_user,
                    department=department,
                    position=position,
                    hire_date=hire_date,
                    salary=salary,
                    status=statut,
                )
        except Exception:
            logger.exception("Échec de création employé (ligne %s, %s)", row_number, email)
            result.errors.append(RowError(row_number, email, "Erreur interne lors de la création."))
            continue

        try:
            send_employee_credentials_email(
                employee_email=email,
                first_name=prenom,
                last_name=nom,
                temp_password=temp_password,
                role=User.Role.EMPLOYEE,
            )
        except Exception:
            logger.exception("Échec de l'envoi de l'email d'identifiants pour %s", email)

        result.created += 1

    return result
