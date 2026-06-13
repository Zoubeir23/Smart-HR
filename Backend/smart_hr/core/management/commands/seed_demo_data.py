"""
Management command: seed_demo_data
Populates the database with realistic Senegalese demo data for Smart-HR.

Usage:
    python manage.py seed_demo_data
    python manage.py seed_demo_data --reset
"""

import random
from datetime import date
from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from smart_hr.conge.models import LeaveRequest
from smart_hr.paiement.models import Payroll
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.recruitment.models import Application
from smart_hr.recruitment.models import JobOffer
from smart_hr.tache.models import Task

User = get_user_model()

# ---------------------------------------------------------------------------
# Static data fixtures
# ---------------------------------------------------------------------------

DEMO_USERS = [
    {
        "username": "admin",
        "email": "admin@smarthr.com",
        "first_name": "Amadou",
        "last_name": "Diallo",
        "role": "ADMIN",
        "tel": "+221 77 100 00 01",
    },
    {
        "username": "rh",
        "email": "rh@smarthr.com",
        "first_name": "Fatou",
        "last_name": "Ndiaye",
        "role": "RH",
        "tel": "+221 77 100 00 02",
    },
    {
        "username": "employee",
        "email": "employee@smarthr.com",
        "first_name": "Moussa",
        "last_name": "Sow",
        "role": "EMPLOYEE",
        "tel": "+221 77 100 00 03",
    },
    {
        "username": "candidate",
        "email": "candidate@smarthr.com",
        "first_name": "Aissatou",
        "last_name": "Ba",
        "role": "CANDIDATE",
        "tel": "+221 77 100 00 04",
    },
]

DEPARTMENTS = [
    {
        "name": "Technologie",
        "description": "Développement logiciel et infrastructure IT",
    },
    {
        "name": "Ressources Humaines",
        "description": "Gestion du personnel et recrutement",
    },
    {
        "name": "Commercial",
        "description": "Ventes, partenariats et développement business",
    },
]

POSITIONS = [
    {"title": "Développeur Backend", "department": "Technologie"},
    {"title": "Développeur Frontend", "department": "Technologie"},
    {"title": "DevOps Engineer", "department": "Technologie"},
    {"title": "Responsable RH", "department": "Ressources Humaines"},
    {"title": "Chargé de Recrutement", "department": "Ressources Humaines"},
    {"title": "Commercial Senior", "department": "Commercial"},
    {"title": "Account Manager", "department": "Commercial"},
]

# 15 Senegalese employee profiles (first_name, last_name, salary, dept, position)
EMPLOYEES_DATA = [
    (
        "Ibrahima",
        "Diop",
        850_000,
        "Technologie",
        "Développeur Backend",
        "1990-03-15",
        "SN001",
    ),
    (
        "Mariama",
        "Fall",
        780_000,
        "Technologie",
        "Développeur Frontend",
        "1993-07-22",
        "SN002",
    ),
    (
        "Ousmane",
        "Sarr",
        920_000,
        "Technologie",
        "DevOps Engineer",
        "1988-11-05",
        "SN003",
    ),
    (
        "Rokhaya",
        "Mbaye",
        1_100_000,
        "Ressources Humaines",
        "Responsable RH",
        "1985-04-30",
        "SN004",
    ),
    (
        "Abdoulaye",
        "Gueye",
        680_000,
        "Ressources Humaines",
        "Chargé de Recrutement",
        "1995-09-18",
        "SN005",
    ),
    (
        "Ndéye",
        "Diagne",
        950_000,
        "Commercial",
        "Commercial Senior",
        "1987-01-12",
        "SN006",
    ),
    (
        "Cheikh",
        "Toure",
        870_000,
        "Commercial",
        "Account Manager",
        "1991-06-25",
        "SN007",
    ),
    (
        "Aminata",
        "Cisse",
        760_000,
        "Technologie",
        "Développeur Frontend",
        "1994-02-08",
        "SN008",
    ),
    (
        "Pape",
        "Diouf",
        840_000,
        "Technologie",
        "Développeur Backend",
        "1992-10-03",
        "SN009",
    ),
    (
        "Seynabou",
        "Thiaw",
        800_000,
        "Commercial",
        "Account Manager",
        "1993-12-17",
        "SN010",
    ),
    (
        "Mame",
        "Diop",
        730_000,
        "Ressources Humaines",
        "Chargé de Recrutement",
        "1996-05-20",
        "SN011",
    ),
    (
        "Lamine",
        "Niang",
        890_000,
        "Technologie",
        "Développeur Backend",
        "1989-08-14",
        "SN012",
    ),
    (
        "Khady",
        "Faye",
        820_000,
        "Technologie",
        "Développeur Frontend",
        "1994-03-29",
        "SN013",
    ),
    (
        "Alioune",
        "Badji",
        960_000,
        "Commercial",
        "Commercial Senior",
        "1986-07-07",
        "SN014",
    ),
    (
        "Coumba",
        "Dieme",
        710_000,
        "Commercial",
        "Account Manager",
        "1997-11-23",
        "SN015",
    ),
]

LEAVE_DATA = [
    # (employee_index, leave_type, days_from_today, duration, status, reason)
    (0, "vacation", -30, 10, "approved", "Congé annuel planifié"),
    (1, "sick", -10, 3, "approved", "Grippe saisonnière"),
    (2, "personal", 5, 2, "pending", "Démarches administratives"),
    (3, "vacation", 15, 7, "pending", "Vacances familiales"),
    (4, "sick", -5, 1, "approved", "Consultation médicale"),
    (5, "personal", -20, 5, "rejected", "Motif insuffisant"),
    (6, "vacation", 30, 14, "pending", "Congé annuel"),
    (7, "maternity", -60, 98, "approved", "Congé maternité légal"),
    (8, "other", -2, 1, "approved", "Urgence familiale"),
    (9, "vacation", -45, 7, "approved", "Congé estival"),
]

TASK_DATA = [
    # (title, description, assignee_index, status, priority, due_offset_days)
    (
        "Refactoring API authentification",
        "Migrer vers JWT v2 et simplifier les endpoints",
        0,
        "done",
        "high",
        -5,
    ),
    (
        "Dashboard analytics RH",
        "Implémenter les graphiques Recharts pour les KPIs",
        1,
        "in_review",
        "high",
        3,
    ),
    (
        "Intégration agent vocal",
        "Brancher Qdrant + FastEmbed sur l'app Django",
        2,
        "in_progress",
        "medium",
        10,
    ),
    (
        "Tests unitaires module congés",
        "Atteindre 80% de couverture sur l'app conge",
        3,
        "todo",
        "medium",
        15,
    ),
    (
        "Documentation API Swagger",
        "Générer la spec OpenAPI via drf-spectacular",
        4,
        "todo",
        "low",
        20,
    ),
    (
        "Optimisation requêtes PostgreSQL",
        "Ajouter index sur les champs filtrés fréquemment",
        0,
        "in_progress",
        "high",
        7,
    ),
    (
        "CI/CD GitHub Actions",
        "Configurer le pipeline de déploiement automatique",
        2,
        "in_review",
        "medium",
        5,
    ),
    (
        "Module paiement - fiches de paie PDF",
        "Générer les bulletins en PDF avec ReportLab",
        1,
        "todo",
        "medium",
        25,
    ),
    (
        "RBAC - permissions granulaires",
        "Affiner les permissions par rôle dans DRF",
        3,
        "done",
        "high",
        -10,
    ),
    (
        "Maquette mobile Figma",
        "Concevoir les écrans employé pour l'app mobile",
        4,
        "todo",
        "low",
        30,
    ),
    (
        "Churn prediction - batch quotidien",
        "Celery beat pour recalculer les scores chaque nuit",
        0,
        "in_progress",
        "high",
        12,
    ),
    (
        "Onboarding candidat - UX",
        "Améliorer le tunnel de candidature côté frontend",
        1,
        "todo",
        "medium",
        18,
    ),
]

JOB_OFFERS = [
    {
        "title": "Développeur Backend Django Senior",
        "department": "Technologie",
        "location": "Dakar, Sénégal",
        "job_type": "full_time",
        "description": (
            "Nous recherchons un développeur Django expérimenté pour renforcer notre équipe technique. "
            "Vous travaillerez sur l'architecture backend de Smart-HR, l'optimisation des APIs REST "
            "et l'intégration des modules d'intelligence artificielle."
        ),
        "requirements": (
            "Python 3.10+ et Django 4.x/5.x\n"
            "Django REST Framework (DRF)\n"
            "PostgreSQL et optimisation SQL\n"
            "Expérience CI/CD (Docker, GitHub Actions)\n"
            "3+ ans d'expérience professionnelle"
        ),
        "salary_range": "800 000 - 1 200 000 FCFA",
    },
    {
        "title": "Développeur React / TypeScript",
        "department": "Technologie",
        "location": "Dakar, Sénégal",
        "job_type": "full_time",
        "description": (
            "Rejoignez notre équipe frontend pour construire l'interface utilisateur de Smart-HR. "
            "Vous développerez des composants React modernes, intégrerez les APIs Django "
            "et assurerez une UX fluide pour nos utilisateurs RH et employés."
        ),
        "requirements": (
            "React 18 + TypeScript\n"
            "Tailwind CSS\n"
            "Gestion d'état (Context API ou Zustand)\n"
            "Intégration API REST (Axios)\n"
            "Tests unitaires (Vitest/Jest)"
        ),
        "salary_range": "700 000 - 1 000 000 FCFA",
    },
    {
        "title": "Data Scientist / ML Engineer",
        "department": "Technologie",
        "location": "Dakar, Sénégal (Remote possible)",
        "job_type": "contract",
        "description": (
            "Nous cherchons un Data Scientist pour améliorer nos modèles de prédiction du churn "
            "et développer de nouvelles fonctionnalités IA. Vous travaillerez sur des datasets RH "
            "réels et intégrerez vos modèles dans notre backend Django."
        ),
        "requirements": (
            "Python (scikit-learn, pandas, numpy)\n"
            "Machine Learning (Random Forest, XGBoost)\n"
            "Déploiement de modèles (pickle, joblib)\n"
            "LLM APIs (OpenAI, Gemini)\n"
            "Expérience NLP appréciée"
        ),
        "salary_range": "900 000 - 1 400 000 FCFA",
    },
    {
        "title": "Commercial B2B SaaS",
        "department": "Commercial",
        "location": "Dakar, Sénégal",
        "job_type": "full_time",
        "description": (
            "Smart-HR recherche un commercial B2B dynamique pour développer son portefeuille clients "
            "PME en Afrique de l'Ouest. Vous présenterez notre solution SIRH, conduirez les démonstrations "
            "produit et négocierez les contrats d'abonnement."
        ),
        "requirements": (
            "Expérience vente SaaS ou logiciels B2B\n"
            "Réseau PME/ETI en Afrique de l'Ouest\n"
            "Maîtrise du français et de l'anglais\n"
            "Autonomie et orientation résultats\n"
            "Permis de conduire"
        ),
        "salary_range": "600 000 - 900 000 FCFA + commissions",
    },
    {
        "title": "Chargé de Recrutement",
        "department": "Ressources Humaines",
        "location": "Dakar, Sénégal",
        "job_type": "full_time",
        "description": (
            "Pour accompagner notre croissance, nous recrutons un Chargé de Recrutement qui gérera "
            "l'ensemble du processus de recrutement : sourcing, présélection, entretiens et onboarding. "
            "Vous utiliserez Smart-HR au quotidien et contribuerez à son amélioration produit."
        ),
        "requirements": (
            "Licence ou Master RH/Psychologie du travail\n"
            "Expérience recrutement (1-3 ans)\n"
            "Maîtrise des outils SIRH\n"
            "Aisance relationnelle\n"
            "Connaissance du droit du travail sénégalais"
        ),
        "salary_range": "550 000 - 750 000 FCFA",
    },
]

APPLICATION_DATA = [
    # (job_offer_index, cover_letter, status, matching_score)
    (
        0,
        "Développeur Django avec 4 ans d'expérience sur des projets SaaS B2B. "
        "J'ai travaillé sur des architectures microservices et je maîtrise DRF, PostgreSQL et Docker.",
        "interview",
        88.5,
    ),
    (
        1,
        "Passionné de React depuis 3 ans, j'ai contribué à plusieurs projets open source "
        "et j'ai une solide expérience avec TypeScript et Tailwind CSS.",
        "reviewing",
        74.0,
    ),
    (
        2,
        "Data Scientist avec expertise en NLP et ML classique. "
        "J'ai entraîné des modèles de prédiction sur des datasets RH similaires à IBM HR Analytics.",
        "pending",
        91.0,
    ),
    (
        3,
        "Commercial avec 5 ans d'expérience dans la vente de solutions SaaS en Afrique subsaharienne. "
        "Mon réseau couvre plus de 200 PME au Sénégal et en Côte d'Ivoire.",
        "accepted",
        82.0,
    ),
    (
        4,
        "Diplômé Master RH de l'Université Cheikh Anta Diop, avec 2 ans d'expérience en cabinet "
        "de recrutement. Je connais parfaitement le marché de l'emploi sénégalais.",
        "rejected",
        55.0,
    ),
]


class Command(BaseCommand):
    help = "Populate the database with realistic Senegalese demo data for Smart-HR."

    def add_arguments(self, parser) -> None:
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete all existing demo data before seeding.",
        )

    def handle(self, *args, **options) -> None:
        if options["reset"]:
            self._reset_data()

        with transaction.atomic():
            rh_user = self._seed_users()
            departments = self._seed_departments()
            positions = self._seed_positions(departments)
            employees = self._seed_employees(departments, positions)
            self._seed_leaves(employees, rh_user)
            self._seed_tasks(employees, rh_user)
            job_offers = self._seed_job_offers(rh_user)
            self._seed_applications(job_offers)
            self._seed_payrolls(employees)

        self.stdout.write(
            self.style.SUCCESS("\n Smart-HR demo data seeded successfully!\n"),
        )
        self._print_credentials()

    # ------------------------------------------------------------------
    # Reset
    # ------------------------------------------------------------------

    def _reset_data(self) -> None:
        self.stdout.write(self.style.WARNING("Resetting demo data..."))
        Application.objects.all().delete()
        JobOffer.objects.all().delete()
        Payroll.objects.all().delete()
        Task.objects.all().delete()
        LeaveRequest.objects.all().delete()
        Employee.objects.all().delete()
        Position.objects.all().delete()
        Department.objects.all().delete()
        User.objects.filter(email__endswith="@smarthr.com").delete()
        # candidate user created by seed
        User.objects.filter(username="candidate").delete()
        self.stdout.write(self.style.WARNING("Reset complete.\n"))

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    def _seed_users(self) -> "User":
        self.stdout.write("  Creating demo users...")
        rh_user = None

        for data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                username=data["username"],
                defaults={
                    "email": data["email"],
                    "first_name": data["first_name"],
                    "last_name": data["last_name"],
                    "role": data["role"],
                    "tel": data["tel"],
                    "is_staff": data["role"] == "ADMIN",
                    "is_superuser": data["role"] == "ADMIN",
                    # Comptes de démo pré-vérifiés : sans cela le candidat est
                    # bloqué au login (vérification OTP exigée pour CANDIDATE).
                    "is_email_verified": True,
                },
            )
            # Synchronise systématiquement l'identité démo, y compris sur un
            # compte pré-existant (ex. superuser "admin"), afin que les
            # identifiants annoncés (email + mot de passe) soient toujours valides.
            user.email = data["email"]
            user.first_name = data["first_name"]
            user.last_name = data["last_name"]
            user.role = data["role"]
            user.tel = data["tel"]
            user.is_staff = data["role"] == "ADMIN"
            user.is_superuser = data["role"] == "ADMIN"
            user.is_email_verified = True
            user.set_password("Smart" + "HR" + "2026" + "!")
            user.save()
            label = "+" if created else "~"
            self.stdout.write(f"    {label} {user.email} ({data['role']})")

            if data["role"] == "RH":
                rh_user = user

        return rh_user

    # ------------------------------------------------------------------
    # Departments
    # ------------------------------------------------------------------

    def _seed_departments(self) -> dict:
        self.stdout.write("  Creating departments...")
        departments = {}

        for dept_data in DEPARTMENTS:
            dept, created = Department.objects.get_or_create(
                name=dept_data["name"],
                defaults={"description": dept_data["description"]},
            )
            departments[dept.name] = dept
            label = "+" if created else "~"
            self.stdout.write(f"    {label} {dept.name}")

        return departments

    # ------------------------------------------------------------------
    # Positions
    # ------------------------------------------------------------------

    def _seed_positions(self, departments: dict) -> dict:
        self.stdout.write("  Creating positions...")
        positions = {}

        for pos_data in POSITIONS:
            dept = departments.get(pos_data["department"])
            pos, created = Position.objects.get_or_create(
                title=pos_data["title"],
                defaults={"department": dept},
            )
            positions[pos.title] = pos
            label = "+" if created else "~"
            self.stdout.write(f"    {label} {pos.title}")

        return positions

    # ------------------------------------------------------------------
    # Employees
    # ------------------------------------------------------------------

    def _seed_employees(self, departments: dict, positions: dict) -> list:
        self.stdout.write("  Creating 15 employees...")
        employees = []

        for i, (first, last, salary, dept_name, pos_title, dob, cin) in enumerate(
            EMPLOYEES_DATA,
        ):
            username = f"{first.lower()}.{last.lower()}"
            email = f"{username}@smarthr.com"

            user, created = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "first_name": first,
                    "last_name": last,
                    "role": "EMPLOYEE",
                    "tel": f"+221 77 200 {i:02d} {(i * 7) % 100:02d}",
                },
            )
            if created:
                user.set_password("Smart" + "HR" + "2026" + "!")
                user.save()

            dept = departments.get(dept_name)
            pos = positions.get(pos_title)
            hire_date = date(2020 + (i % 4), (i % 12) + 1, (i % 28) + 1)
            churn_risk = round(random.uniform(5.0, 75.0), 1)

            emp, emp_created = Employee.objects.get_or_create(
                user=user,
                defaults={
                    "department": dept,
                    "position": pos,
                    "hire_date": hire_date,
                    "salary": Decimal(salary),
                    "status": Employee.Status.ACTIVE,
                    "date_of_birth": date.fromisoformat(dob),
                    "cin": cin,
                    "address": "Dakar, Sénégal",
                    "churn_risk": churn_risk,
                },
            )
            employees.append(emp)
            label = "+" if emp_created else "~"
            self.stdout.write(f"    {label} {first} {last} [{dept_name}]")

        self._ensure_demo_employee_profiles(departments, positions, employees)
        return employees

    def _ensure_demo_employee_profiles(self, departments: dict, positions: dict, employees: list) -> None:
        """Crée un profil Employee pour les comptes de démo 'employee' et 'rh'.

        Sans cela, ces comptes (annoncés pour démontrer congés/profil/tâches)
        n'ont pas de profil et reçoivent 'Aucun profil employé trouvé'.
        """
        any_position = next(iter(positions.values()), None)
        default_dept = next(iter(departments.values()), None)
        rh_dept = departments.get("Ressources Humaines") or default_dept
        demo_links = [
            ("employee@smarthr.com", default_dept, "1990-05-12", "SN-DEMO-EMP"),
            ("rh@smarthr.com", rh_dept, "1988-03-20", "SN-DEMO-RH"),
        ]
        for email, dept, dob, cin in demo_links:
            user = User.objects.filter(email=email).first()
            if not user:
                continue
            emp, created = Employee.objects.get_or_create(
                user=user,
                defaults={
                    "department": dept,
                    "position": any_position,
                    "hire_date": date(2021, 1, 15),
                    "salary": Decimal("1800000"),
                    "status": Employee.Status.ACTIVE,
                    "date_of_birth": date.fromisoformat(dob),
                    "cin": cin,
                    "address": "Dakar, Sénégal",
                    "churn_risk": 20.0,
                },
            )
            if created:
                employees.append(emp)
                self.stdout.write(f"    + profil démo lié à {email}")

    # ------------------------------------------------------------------
    # Leave requests
    # ------------------------------------------------------------------

    def _seed_leaves(self, employees: list, rh_user: "User") -> None:
        self.stdout.write("  Creating leave requests...")
        today = date.today()
        created_count = 0

        for (
            emp_idx,
            leave_type,
            days_from_today,
            duration,
            status,
            reason,
        ) in LEAVE_DATA:
            if emp_idx >= len(employees):
                continue

            employee = employees[emp_idx]
            start = today + timedelta(days=days_from_today)
            end = start + timedelta(days=duration - 1)

            approved_by = rh_user if status == "approved" else None

            _, created = LeaveRequest.objects.get_or_create(
                employee=employee,
                leave_type=leave_type,
                start_date=start,
                defaults={
                    "end_date": end,
                    "status": status,
                    "reason": reason,
                    "approved_by": approved_by,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(f"    + {created_count} leave requests created")

    # ------------------------------------------------------------------
    # Tasks
    # ------------------------------------------------------------------

    def _seed_tasks(self, employees: list, rh_user: "User") -> None:
        self.stdout.write("  Creating tasks...")
        today = date.today()
        created_count = 0

        for title, description, assignee_idx, status, priority, due_offset in TASK_DATA:
            if assignee_idx >= len(employees):
                continue

            assignee = employees[assignee_idx]
            due_date = today + timedelta(days=due_offset)

            _, created = Task.objects.get_or_create(
                title=title,
                defaults={
                    "description": description,
                    "assignee": assignee,
                    "created_by": rh_user,
                    "status": status,
                    "priority": priority,
                    "due_date": due_date,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(f"    + {created_count} tasks created")

    # ------------------------------------------------------------------
    # Job offers
    # ------------------------------------------------------------------

    def _seed_job_offers(self, rh_user: "User") -> list:
        self.stdout.write("  Creating job offers...")
        job_offers = []

        for offer_data in JOB_OFFERS:
            offer, created = JobOffer.objects.get_or_create(
                title=offer_data["title"],
                defaults={
                    "department": offer_data["department"],
                    "location": offer_data["location"],
                    "job_type": offer_data["job_type"],
                    "description": offer_data["description"],
                    "requirements": offer_data["requirements"],
                    "salary_range": offer_data["salary_range"],
                    "status": JobOffer.Status.OPEN,
                    "created_by": rh_user,
                },
            )
            job_offers.append(offer)
            label = "+" if created else "~"
            self.stdout.write(f"    {label} {offer.title}")

        return job_offers

    # ------------------------------------------------------------------
    # Applications
    # ------------------------------------------------------------------

    def _seed_applications(self, job_offers: list) -> None:
        self.stdout.write("  Creating applications...")
        candidate_user = User.objects.filter(role="CANDIDATE").first()

        if not candidate_user:
            self.stdout.write(
                self.style.WARNING(
                    "    No CANDIDATE user found, skipping applications.",
                ),
            )
            return

        created_count = 0

        for offer_idx, cover_letter, status, matching_score in APPLICATION_DATA:
            if offer_idx >= len(job_offers):
                continue

            job_offer = job_offers[offer_idx]

            _, created = Application.objects.get_or_create(
                job_offer=job_offer,
                candidate=candidate_user,
                defaults={
                    "cv": "cvs/demo_cv_placeholder.pdf",
                    "cover_letter": cover_letter,
                    "status": status,
                    "matching_score": matching_score,
                },
            )
            if created:
                created_count += 1

        self.stdout.write(f"    + {created_count} applications created")

    # ------------------------------------------------------------------
    # Payrolls  (last 3 months, 4 employees covered = 12 records)
    # ------------------------------------------------------------------

    def _seed_payrolls(self, employees: list) -> None:
        self.stdout.write("  Creating payroll records (last 3 months)...")
        today = date.today()
        created_count = 0

        # Build 3 month labels: current and 2 previous
        months = []
        for delta in range(3):
            d = date(today.year, today.month, 1) - timedelta(days=delta * 30)
            months.append(f"{d.year}-{d.month:02d}")

        # Use first 4 employees for 12 payroll records (3 months x 4 employees)
        payroll_employees = employees[:4]

        for employee in payroll_employees:
            base = employee.salary
            for month in months:
                bonus = Decimal("50000") if random.random() > 0.6 else Decimal("0")
                deduction = Decimal("75000")  # cotisations sociales
                # 2 oldest are paid, current is processed — status logic below
                if month == months[0]:
                    status = Payroll.Status.PENDING
                elif month == months[1]:
                    status = Payroll.Status.PROCESSED
                else:
                    status = Payroll.Status.PAID

                _, created = Payroll.objects.get_or_create(
                    employee=employee,
                    month=month,
                    defaults={
                        "base_salary": base,
                        "bonuses": bonus,
                        "deductions": deduction,
                        "status": status,
                    },
                )
                if created:
                    created_count += 1

        self.stdout.write(f"    + {created_count} payroll records created")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_credentials(self) -> None:
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(
            self.style.SUCCESS(f"  DEMO CREDENTIALS  (password: {'Smart' + 'HR' + '2026' + '!'})"),
        )
        self.stdout.write(self.style.SUCCESS("=" * 60))
        rows = [
            ("Admin", "admin@smarthr.com", "Acces complet + Django admin"),
            ("RH", "rh@smarthr.com", "Dashboard, congés, recrutement"),
            ("Employé", "employee@smarthr.com", "Profil, congés, tâches"),
            ("Candidat", "candidate@smarthr.com", "Offres, candidatures"),
        ]
        for role, email, desc in rows:
            self.stdout.write(f"  {role:<12} {email:<30} {desc}")
        self.stdout.write(self.style.SUCCESS("=" * 60))
