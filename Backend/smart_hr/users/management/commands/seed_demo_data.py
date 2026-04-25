from datetime import date, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from allauth.account.models import EmailAddress

from smart_hr.conge.models import LeaveRequest
from smart_hr.formation.models import Formation
from smart_hr.formation.models import Meeting
from smart_hr.paiement.models import Payroll
from smart_hr.personnel.models import Department
from smart_hr.personnel.models import Employee
from smart_hr.personnel.models import Position
from smart_hr.presence.models import Attendance
from smart_hr.recruitment.models import JobOffer
from smart_hr.tache.models import Task
from smart_hr.users.models import User


DEMO_USERS = [
    {
        "email": "admin@smarthr.com",
        "password": "admin123",
        "role": User.Role.ADMIN,
        "first_name": "Admin",
        "last_name": "Système",
        "username": "admin_systeme",
    },
    {
        "email": "rh@smarthr.com",
        "password": "rh123",
        "role": User.Role.RH,
        "first_name": "Marie",
        "last_name": "Dupont",
        "username": "marie_dupont",
    },
    {
        "email": "employee@smarthr.com",
        "password": "employee123",
        "role": User.Role.EMPLOYEE,
        "first_name": "Jean",
        "last_name": "Martin",
        "username": "jean_martin",
    },
    {
        "email": "employee2@smarthr.com",
        "password": "employee123",
        "role": User.Role.EMPLOYEE,
        "first_name": "Fatou",
        "last_name": "Ndiaye",
        "username": "fatou_ndiaye",
    },
    {
        "email": "employee3@smarthr.com",
        "password": "employee123",
        "role": User.Role.EMPLOYEE,
        "first_name": "Moussa",
        "last_name": "Diop",
        "username": "moussa_diop",
    },
    {
        "email": "candidate@smarthr.com",
        "password": "candidate123",
        "role": User.Role.CANDIDATE,
        "first_name": "Amina",
        "last_name": "Diallo",
        "username": "amina_diallo",
    },
]


class Command(BaseCommand):
    help = "Seed demo accounts, departments, positions, employees, tasks, leaves, attendance, and payroll for Smart-HR."

    def handle(self, *args, **options):
        self._seed_departments_and_positions()
        self._seed_users()
        employees = self._seed_employee_profiles()
        rh_user = User.objects.filter(email="rh@smarthr.com").first()
        if employees:
            self._seed_leaves(employees, rh_user)
            self._seed_tasks(employees, rh_user)
            self._seed_attendance(employees)
            self._seed_payroll(employees)
        self._seed_job_offers(rh_user)
        self._seed_formations()
        self.stdout.write(self.style.SUCCESS("Demo data seeded successfully."))

    # ------------------------------------------------------------------
    # Departments & Positions
    # ------------------------------------------------------------------

    def _seed_departments_and_positions(self):
        departments_with_positions = [
            ("Informatique", ["Développeur Backend", "Développeur Frontend", "DevOps Engineer"]),
            ("Ressources Humaines", ["Responsable RH", "Assistant RH", "Chargé de Recrutement"]),
            ("Finance", ["Directeur Financier", "Analyste Financier", "Comptable"]),
            ("Commercial", ["Directeur Commercial", "Chargé d'Affaires", "Account Manager"]),
            ("Direction", ["Directeur Général", "Assistant de Direction"]),
        ]

        for dept_name, position_titles in departments_with_positions:
            department, dept_created = Department.objects.get_or_create(
                name=dept_name,
                defaults={"description": f"Département {dept_name}"},
            )
            if dept_created:
                self.stdout.write(f"  Département créé : {dept_name}")

            for title in position_titles:
                _, pos_created = Position.objects.get_or_create(
                    title=title,
                    defaults={"department": department},
                )
                if pos_created:
                    self.stdout.write(f"    Poste créé : {title}")

    # ------------------------------------------------------------------
    # Users
    # ------------------------------------------------------------------

    def _seed_users(self):
        for user_data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=user_data["email"],
                defaults={
                    "username": user_data["username"],
                    "first_name": user_data["first_name"],
                    "last_name": user_data["last_name"],
                    "role": user_data["role"],
                    "is_active": True,
                },
            )

            if created:
                user.set_password(user_data["password"])
                user.save()
                EmailAddress.objects.get_or_create(
                    user=user,
                    email=user.email,
                    defaults={"primary": True, "verified": True},
                )
                self.stdout.write(f"  Compte créé : {user.email} (rôle: {user.role})")
            else:
                self.stdout.write(f"  Compte existant : {user.email}")

    # ------------------------------------------------------------------
    # Employee profiles
    # ------------------------------------------------------------------

    def _seed_employee_profiles(self) -> list:
        try:
            informatique = Department.objects.get(name="Informatique")
            ressources_humaines = Department.objects.get(name="Ressources Humaines")
            finance = Department.objects.get(name="Finance")
            dev_backend = Position.objects.get(title="Développeur Backend")
            dev_frontend = Position.objects.get(title="Développeur Frontend")
            responsable_rh = Position.objects.get(title="Responsable RH")
            analyste = Position.objects.get(title="Analyste Financier")
        except (Department.DoesNotExist, Position.DoesNotExist) as exc:
            self.stdout.write(self.style.WARNING(f"Profils employés ignorés : {exc}"))
            return []

        profiles_specs = [
            {
                "email": "rh@smarthr.com",
                "department": ressources_humaines,
                "position": responsable_rh,
                "hire_date": "2021-01-10",
                "salary": 2000000,
                "cin": "SN7654321",
                "address": "Dakar, Sénégal",
            },
            {
                "email": "employee@smarthr.com",
                "department": informatique,
                "position": dev_backend,
                "hire_date": "2022-03-15",
                "salary": 1500000,
                "cin": "SN1234567",
                "address": "Dakar, Sénégal",
            },
            {
                "email": "employee2@smarthr.com",
                "department": informatique,
                "position": dev_frontend,
                "hire_date": "2023-06-01",
                "salary": 1200000,
                "cin": "SN9876543",
                "address": "Thiès, Sénégal",
            },
            {
                "email": "employee3@smarthr.com",
                "department": finance,
                "position": analyste,
                "hire_date": "2022-09-20",
                "salary": 1800000,
                "cin": "SN1122334",
                "address": "Saint-Louis, Sénégal",
            },
        ]

        employees = []
        for spec in profiles_specs:
            try:
                user = User.objects.get(email=spec["email"])
            except User.DoesNotExist:
                continue

            employee, created = Employee.objects.get_or_create(
                user=user,
                defaults={
                    "department": spec["department"],
                    "position": spec["position"],
                    "hire_date": spec["hire_date"],
                    "salary": spec["salary"],
                    "status": Employee.Status.ACTIVE,
                    "cin": spec["cin"],
                    "address": spec["address"],
                },
            )
            if created:
                self.stdout.write(f"  Profil employé créé : {user.email}")
            else:
                self.stdout.write(f"  Profil employé existant : {user.email}")
            employees.append(employee)

        return employees

    # ------------------------------------------------------------------
    # Leave requests
    # ------------------------------------------------------------------

    def _seed_leaves(self, employees: list, rh_user):
        today = date.today()
        leave_specs = [
            {
                "employee": employees[0],
                "leave_type": LeaveRequest.LeaveType.VACATION,
                "start_date": today - timedelta(days=30),
                "end_date": today - timedelta(days=23),
                "reason": "Congé annuel 2026",
                "status": LeaveRequest.Status.APPROVED,
                "approved_by": rh_user,
            },
            {
                "employee": employees[1] if len(employees) > 1 else employees[0],
                "leave_type": LeaveRequest.LeaveType.SICK,
                "start_date": today - timedelta(days=10),
                "end_date": today - timedelta(days=8),
                "reason": "Grippe saisonnière",
                "status": LeaveRequest.Status.APPROVED,
                "approved_by": rh_user,
            },
            {
                "employee": employees[1] if len(employees) > 1 else employees[0],
                "leave_type": LeaveRequest.LeaveType.PERSONAL,
                "start_date": today + timedelta(days=5),
                "end_date": today + timedelta(days=7),
                "reason": "Démarches administratives",
                "status": LeaveRequest.Status.PENDING,
                "approved_by": None,
            },
            {
                "employee": employees[2] if len(employees) > 2 else employees[0],
                "leave_type": LeaveRequest.LeaveType.VACATION,
                "start_date": today + timedelta(days=15),
                "end_date": today + timedelta(days=25),
                "reason": "Vacances familiales",
                "status": LeaveRequest.Status.PENDING,
                "approved_by": None,
            },
        ]

        for spec in leave_specs:
            existing = LeaveRequest.objects.filter(
                employee=spec["employee"],
                start_date=spec["start_date"],
                end_date=spec["end_date"],
            ).first()
            if existing:
                continue

            LeaveRequest.objects.create(
                employee=spec["employee"],
                leave_type=spec["leave_type"],
                start_date=spec["start_date"],
                end_date=spec["end_date"],
                reason=spec["reason"],
                status=spec["status"],
                approved_by=spec["approved_by"],
            )
            self.stdout.write(f"  Congé créé : {spec['employee']} ({spec['leave_type']})")

    # ------------------------------------------------------------------
    # Tasks
    # ------------------------------------------------------------------

    def _seed_tasks(self, employees: list, created_by_user):
        today = date.today()
        task_specs = [
            {
                "title": "Refactoriser l'API d'authentification",
                "description": "Migrer vers JWT avec refresh token et blacklist.",
                "assignee": employees[0],
                "status": Task.Status.DONE,
                "priority": Task.Priority.HIGH,
                "due_date": today - timedelta(days=5),
            },
            {
                "title": "Développer le module de présences",
                "description": "Implémentation du suivi de présence avec export CSV.",
                "assignee": employees[1] if len(employees) > 1 else employees[0],
                "status": Task.Status.IN_PROGRESS,
                "priority": Task.Priority.HIGH,
                "due_date": today + timedelta(days=3),
            },
            {
                "title": "Corriger le bug de pagination",
                "description": "Les résultats de la liste des employés ne sont pas paginés correctement.",
                "assignee": employees[1] if len(employees) > 1 else employees[0],
                "status": Task.Status.IN_REVIEW,
                "priority": Task.Priority.MEDIUM,
                "due_date": today + timedelta(days=1),
            },
            {
                "title": "Rédiger la documentation API",
                "description": "Documenter tous les endpoints REST avec des exemples.",
                "assignee": employees[2] if len(employees) > 2 else employees[0],
                "status": Task.Status.TODO,
                "priority": Task.Priority.LOW,
                "due_date": today + timedelta(days=14),
            },
            {
                "title": "Configurer les alertes de churn",
                "description": "Mettre en place des notifications automatiques pour les employés à risque.",
                "assignee": employees[0],
                "status": Task.Status.IN_PROGRESS,
                "priority": Task.Priority.HIGH,
                "due_date": today + timedelta(days=7),
            },
        ]

        for spec in task_specs:
            existing = Task.objects.filter(
                title=spec["title"],
                assignee=spec["assignee"],
            ).first()
            if existing:
                continue

            Task.objects.create(
                title=spec["title"],
                description=spec["description"],
                assignee=spec["assignee"],
                created_by=created_by_user,
                status=spec["status"],
                priority=spec["priority"],
                due_date=spec["due_date"],
            )
            self.stdout.write(f"  Tâche créée : {spec['title']}")

    # ------------------------------------------------------------------
    # Attendance
    # ------------------------------------------------------------------

    def _seed_attendance(self, employees: list):
        today = date.today()
        attendance_specs = []

        for employee in employees:
            for days_ago in range(7):
                record_date = today - timedelta(days=days_ago)
                if record_date.weekday() >= 5:
                    continue

                if days_ago == 0:
                    status = Attendance.Status.PRESENT
                elif days_ago == 3 and employees.index(employee) == 1:
                    status = Attendance.Status.LATE
                elif days_ago == 5 and employees.index(employee) == 2:
                    status = Attendance.Status.ABSENT
                else:
                    status = Attendance.Status.PRESENT

                attendance_specs.append({
                    "employee": employee,
                    "date": record_date,
                    "check_in": "08:30:00" if status != Attendance.Status.ABSENT else None,
                    "check_out": "17:30:00" if status != Attendance.Status.ABSENT else None,
                    "status": status,
                })

        for spec in attendance_specs:
            _, created = Attendance.objects.get_or_create(
                employee=spec["employee"],
                date=spec["date"],
                defaults={
                    "check_in": spec["check_in"],
                    "check_out": spec["check_out"],
                    "status": spec["status"],
                },
            )
            if created:
                self.stdout.write(f"  Présence créée : {spec['employee']} - {spec['date']}")

    # ------------------------------------------------------------------
    # Payroll
    # ------------------------------------------------------------------

    def _seed_payroll(self, employees: list):
        today = date.today()
        months_to_seed = []
        for months_ago in range(3):
            month_date = today.replace(day=1) - timedelta(days=months_ago * 28)
            months_to_seed.append(month_date.strftime("%Y-%m"))

        for employee in employees:
            base_salary = float(employee.salary)
            for month_str in months_to_seed:
                _, created = Payroll.objects.get_or_create(
                    employee=employee,
                    month=month_str,
                    defaults={
                        "base_salary": base_salary,
                        "bonuses": 0,
                        "deductions": base_salary * 0.1,
                        "status": Payroll.Status.PAID if month_str != months_to_seed[0] else Payroll.Status.PENDING,
                    },
                )
                if created:
                    self.stdout.write(f"  Paie créée : {employee} - {month_str}")

    # ------------------------------------------------------------------
    # Job Offers
    # ------------------------------------------------------------------

    def _seed_job_offers(self, created_by_user):
        job_offers_specs = [
            {
                "title": "Développeur Full-Stack Python/React",
                "department": "Informatique",
                "location": "Dakar, Sénégal (Hybride)",
                "job_type": JobOffer.JobType.FULL_TIME,
                "description": (
                    "Nous recherchons un développeur Full-Stack expérimenté pour renforcer "
                    "notre équipe technique. Vous contribuerez au développement de notre "
                    "plateforme SIRH Smart-HR en utilisant Python/Django et React."
                ),
                "requirements": (
                    "3+ ans d'expérience en développement Python\n"
                    "Maîtrise de Django et Django REST Framework\n"
                    "Expérience avec React et TypeScript\n"
                    "Connaissance des bases de données PostgreSQL\n"
                    "Bonne maîtrise de Git et des pratiques CI/CD"
                ),
                "salary_range": "1 200 000 - 1 800 000 FCFA / mois",
                "status": JobOffer.Status.OPEN,
            },
            {
                "title": "Data Scientist / ML Engineer",
                "department": "Informatique",
                "location": "Dakar, Sénégal",
                "job_type": JobOffer.JobType.FULL_TIME,
                "description": (
                    "Rejoignez notre équipe IA pour développer et améliorer nos modèles "
                    "de machine learning. Vous travaillerez sur la prédiction de churn, "
                    "l'analyse RH prédictive et le matching automatique CV/Offre."
                ),
                "requirements": (
                    "Master en Data Science, Statistiques ou domaine connexe\n"
                    "Maîtrise de Python et des bibliothèques ML (scikit-learn, pandas, numpy)\n"
                    "Expérience avec les LLM et l'IA générative\n"
                    "Connaissance des techniques NLP\n"
                    "Capacité à déployer des modèles en production"
                ),
                "salary_range": "1 500 000 - 2 200 000 FCFA / mois",
                "status": JobOffer.Status.OPEN,
            },
            {
                "title": "Chargé de Recrutement RH",
                "department": "Ressources Humaines",
                "location": "Dakar, Sénégal",
                "job_type": JobOffer.JobType.FULL_TIME,
                "description": (
                    "Nous cherchons un Chargé de Recrutement pour gérer l'acquisition "
                    "de talents au sein de Smart-HR. Vous serez responsable du processus "
                    "de recrutement de A à Z, de la publication des offres à l'intégration."
                ),
                "requirements": (
                    "Licence/Master en RH ou domaine connexe\n"
                    "2+ ans d'expérience en recrutement\n"
                    "Excellentes compétences relationnelles\n"
                    "Maîtrise des outils ATS\n"
                    "Bonne rédaction des offres d'emploi"
                ),
                "salary_range": "900 000 - 1 300 000 FCFA / mois",
                "status": JobOffer.Status.OPEN,
            },
            {
                "title": "DevOps / Cloud Engineer",
                "department": "Informatique",
                "location": "Télétravail complet",
                "job_type": JobOffer.JobType.CONTRACT,
                "description": (
                    "Mission de 6 mois pour automatiser et optimiser notre infrastructure "
                    "cloud. Vous mettrez en place des pipelines CI/CD robustes et "
                    "assurerez la scalabilité de notre plateforme."
                ),
                "requirements": (
                    "Maîtrise de Docker et Kubernetes\n"
                    "Expérience AWS ou GCP\n"
                    "Connaissance de GitHub Actions / GitLab CI\n"
                    "Compétences en monitoring (Prometheus, Grafana)\n"
                    "Certification cloud appréciée"
                ),
                "salary_range": "2 000 000 - 2 500 000 FCFA / mois",
                "status": JobOffer.Status.OPEN,
            },
            {
                "title": "Stage — Assistant Développeur Backend",
                "department": "Informatique",
                "location": "Dakar, Sénégal",
                "job_type": JobOffer.JobType.INTERNSHIP,
                "description": (
                    "Stage de 3 à 6 mois pour un étudiant en informatique souhaitant "
                    "acquérir une expérience pratique en développement backend avec Python/Django."
                ),
                "requirements": (
                    "En cours de formation Bac+3 à Bac+5 en informatique\n"
                    "Bases en Python et programmation orientée objet\n"
                    "Curiosité et envie d'apprendre\n"
                    "Connaissance des APIs REST"
                ),
                "salary_range": "150 000 - 250 000 FCFA / mois",
                "status": JobOffer.Status.OPEN,
            },
        ]

        for spec in job_offers_specs:
            _, created = JobOffer.objects.get_or_create(
                title=spec["title"],
                defaults={
                    "department": spec["department"],
                    "location": spec["location"],
                    "job_type": spec["job_type"],
                    "description": spec["description"],
                    "requirements": spec["requirements"],
                    "salary_range": spec["salary_range"],
                    "status": spec["status"],
                    "created_by": created_by_user,
                },
            )
            if created:
                self.stdout.write(f"  Offre créée : {spec['title']}")

    # ------------------------------------------------------------------
    # Formations & Meetings
    # ------------------------------------------------------------------

    def _seed_formations(self):
        today = date.today()
        formations_specs = [
            {
                "title": "Formation Django REST Framework Avancé",
                "description": (
                    "Maîtriser les ViewSets, Serializers, Permissions et l'optimisation "
                    "des requêtes avec DRF. Inclut des exercices pratiques sur un projet réel."
                ),
                "start_date": timezone.make_aware(
                    timezone.datetime(today.year, today.month, today.day, 9, 0)
                    - timedelta(days=14)
                ),
                "end_date": timezone.make_aware(
                    timezone.datetime(today.year, today.month, today.day, 17, 0)
                    - timedelta(days=12)
                ),
                "instructor": "Dr. Ibrahima Sow",
                "meetings": [
                    {
                        "title": "Introduction et ViewSets",
                        "start_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 9, 0)
                            - timedelta(days=14)
                        ),
                        "end_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 12, 0)
                            - timedelta(days=14)
                        ),
                        "status": Meeting.Status.COMPLETED,
                    },
                    {
                        "title": "Authentification JWT et Permissions",
                        "start_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 14, 0)
                            - timedelta(days=14)
                        ),
                        "end_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 17, 0)
                            - timedelta(days=14)
                        ),
                        "status": Meeting.Status.COMPLETED,
                    },
                ],
            },
            {
                "title": "Atelier React + TypeScript pour développeurs Backend",
                "description": (
                    "Introduction au développement frontend avec React 18 et TypeScript. "
                    "Focus sur les hooks, React Query et l'intégration avec une API REST."
                ),
                "start_date": timezone.make_aware(
                    timezone.datetime(today.year, today.month, today.day, 9, 0)
                    + timedelta(days=7)
                ),
                "end_date": timezone.make_aware(
                    timezone.datetime(today.year, today.month, today.day, 17, 0)
                    + timedelta(days=9)
                ),
                "instructor": "Mme Aïssatou Diallo",
                "meetings": [
                    {
                        "title": "React Hooks et State Management",
                        "start_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 9, 0)
                            + timedelta(days=7)
                        ),
                        "end_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 12, 0)
                            + timedelta(days=7)
                        ),
                        "status": Meeting.Status.SCHEDULED,
                        "meeting_link": "https://zoom.us/j/demo123456",
                    },
                ],
            },
            {
                "title": "Sécurité des Applications Web",
                "description": (
                    "Découvrez les failles OWASP Top 10 et comment les prévenir. "
                    "Authentification sécurisée, protection CSRF, XSS, injection SQL."
                ),
                "start_date": timezone.make_aware(
                    timezone.datetime(today.year, today.month, today.day, 9, 0)
                    + timedelta(days=21)
                ),
                "end_date": timezone.make_aware(
                    timezone.datetime(today.year, today.month, today.day, 17, 0)
                    + timedelta(days=22)
                ),
                "instructor": "M. Omar Ba",
                "meetings": [
                    {
                        "title": "OWASP Top 10 et bonnes pratiques",
                        "start_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 9, 0)
                            + timedelta(days=21)
                        ),
                        "end_time": timezone.make_aware(
                            timezone.datetime(today.year, today.month, today.day, 17, 0)
                            + timedelta(days=21)
                        ),
                        "status": Meeting.Status.SCHEDULED,
                        "meeting_link": "https://zoom.us/j/demo789012",
                    },
                ],
            },
        ]

        for formation_spec in formations_specs:
            meetings_data = formation_spec.pop("meetings", [])
            formation, created = Formation.objects.get_or_create(
                title=formation_spec["title"],
                defaults={
                    "description": formation_spec["description"],
                    "start_date": formation_spec["start_date"],
                    "end_date": formation_spec["end_date"],
                    "instructor": formation_spec["instructor"],
                },
            )
            if created:
                self.stdout.write(f"  Formation créée : {formation.title}")
                for meeting_data in meetings_data:
                    Meeting.objects.create(
                        formation=formation,
                        title=meeting_data["title"],
                        start_time=meeting_data["start_time"],
                        end_time=meeting_data["end_time"],
                        status=meeting_data["status"],
                        meeting_link=meeting_data.get("meeting_link"),
                    )
                    self.stdout.write(f"    Réunion créée : {meeting_data['title']}")
