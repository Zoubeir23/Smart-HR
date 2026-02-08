"""
Management command to seed demo data for Smart-HR.
Comptes de démo : admin, rh, employee, candidate

Usage:
    python manage.py seed
"""
from datetime import date, time, timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management.base import BaseCommand

from conge.models import LeaveRequest
from paiement.models import Payroll
from personnel.models import Department, Employee, Position
from presence.models import Attendance
from recruitment.models import Application, JobOffer
from tache.models import Task

User = get_user_model()


class Command(BaseCommand):
    help = 'Initialise les données de démonstration (comptes démo, employés, congés, etc.)'

    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')

        # --- Users (comptes démo) ---
        admin_user, _ = User.objects.get_or_create(
            email='admin@smarthr.com',
            defaults={
                'username': 'admin',
                'first_name': 'Amadou',
                'last_name': 'Diallo',
                'role': 'ADMIN',
                'is_staff': True,
                'is_superuser': True,
            },
        )
        admin_user.set_password('admin123')
        admin_user.save()

        rh_user, _ = User.objects.get_or_create(
            email='rh@smarthr.com',
            defaults={
                'username': 'rh',
                'first_name': 'Fatou',
                'last_name': 'Sow',
                'role': 'RH',
                'is_staff': True,
            },
        )
        rh_user.set_password('rh123')
        rh_user.save()

        emp_user, _ = User.objects.get_or_create(
            email='employee@smarthr.com',
            defaults={
                'username': 'employee',
                'first_name': 'Moussa',
                'last_name': 'Ndiaye',
                'role': 'EMPLOYEE',
            },
        )
        emp_user.set_password('employee123')
        emp_user.save()

        candidate_user, _ = User.objects.get_or_create(
            email='candidate@smarthr.com',
            defaults={
                'username': 'candidate',
                'first_name': 'Aissatou',
                'last_name': 'Ba',
                'role': 'CANDIDATE',
            },
        )
        candidate_user.set_password('candidate123')
        candidate_user.save()

        self.stdout.write(self.style.SUCCESS(f'  ✓ Users: {User.objects.count()}'))

        # --- Departments ---
        departments = {}
        for name, desc in [
            ('Informatique', 'Département IT et développement'),
            ('Ressources Humaines', 'Gestion du personnel'),
            ('Finance', 'Comptabilité et finances'),
            ('Marketing', 'Communication et marketing'),
            ('Direction', 'Direction générale'),
        ]:
            dept, _ = Department.objects.get_or_create(name=name, defaults={'description': desc})
            departments[name] = dept

        # --- Positions ---
        positions = {}
        for title, dept_name in [
            ('Développeur Full Stack', 'Informatique'),
            ('Développeur Backend', 'Informatique'),
            ('Chef de projet', 'Informatique'),
            ('Responsable RH', 'Ressources Humaines'),
            ('Assistant RH', 'Ressources Humaines'),
            ('Comptable', 'Finance'),
            ('Directeur Financier', 'Finance'),
            ('Community Manager', 'Marketing'),
            ('Directeur Général', 'Direction'),
        ]:
            pos, _ = Position.objects.get_or_create(
                title=title,
                defaults={'department': departments.get(dept_name)},
            )
            positions[title] = pos

        # --- Extra employees ---
        extra_users = []
        for fn, ln, email in [
            ('Ibrahima', 'Fall', 'ibrahima.fall@smarthr.com'),
            ('Mariama', 'Diop', 'mariama.diop@smarthr.com'),
            ('Ousmane', 'Sy', 'ousmane.sy@smarthr.com'),
            ('Khady', 'Mbaye', 'khady.mbaye@smarthr.com'),
            ('Cheikh', 'Gueye', 'cheikh.gueye@smarthr.com'),
            ('Ndeye', 'Sarr', 'ndeye.sarr@smarthr.com'),
        ]:
            u, _ = User.objects.get_or_create(
                email=email,
                defaults={
                    'username': email.split('@')[0].replace('.', '_'),
                    'first_name': fn,
                    'last_name': ln,
                    'role': 'EMPLOYEE',
                },
            )
            u.set_password('employee123')
            u.save()
            extra_users.append(u)

        # --- Employees ---
        employee_data = [
            (admin_user, 'Direction', 'Directeur Général', '2020-01-15', 1500000, 'active'),
            (rh_user, 'Ressources Humaines', 'Responsable RH', '2021-03-01', 900000, 'active'),
            (emp_user, 'Informatique', 'Développeur Full Stack', '2022-06-15', 750000, 'active'),
            (extra_users[0], 'Informatique', 'Développeur Backend', '2022-09-01', 700000, 'active'),
            (extra_users[1], 'Ressources Humaines', 'Assistant RH', '2023-01-10', 550000, 'active'),
            (extra_users[2], 'Finance', 'Comptable', '2021-11-01', 650000, 'active'),
            (extra_users[3], 'Marketing', 'Community Manager', '2023-04-01', 500000, 'on_leave'),
            (extra_users[4], 'Finance', 'Directeur Financier', '2020-06-01', 1200000, 'active'),
            (extra_users[5], 'Informatique', 'Chef de projet', '2021-08-15', 950000, 'active'),
        ]

        employees = []
        for user, dept_name, pos_title, hire, salary, status in employee_data:
            emp, _ = Employee.objects.get_or_create(
                user=user,
                defaults={
                    'department': departments[dept_name],
                    'position': positions[pos_title],
                    'hire_date': hire,
                    'salary': salary,
                    'status': status,
                },
            )
            employees.append(emp)

        self.stdout.write(self.style.SUCCESS(f'  ✓ Employees: {Employee.objects.count()}'))

        # --- Leave Requests ---
        today = date.today()
        leave_data = [
            (employees[2], 'vacation', 'pending', today + timedelta(days=10), today + timedelta(days=17), 'Vacances familiales'),
            (employees[3], 'sick', 'approved', today - timedelta(days=3), today + timedelta(days=2), 'Maladie'),
            (employees[6], 'maternity', 'approved', today - timedelta(days=30), today + timedelta(days=60), 'Congé maternité'),
            (employees[4], 'personal', 'rejected', today + timedelta(days=5), today + timedelta(days=6), 'Rendez-vous personnel'),
            (employees[5], 'vacation', 'pending', today + timedelta(days=20), today + timedelta(days=30), 'Vacances été'),
        ]

        for emp, ltype, stat, start, end, reason in leave_data:
            LeaveRequest.objects.get_or_create(
                employee=emp,
                start_date=start,
                defaults={
                    'leave_type': ltype,
                    'status': stat,
                    'end_date': end,
                    'reason': reason,
                    'approved_by': rh_user if stat != 'pending' else None,
                },
            )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Leave Requests: {LeaveRequest.objects.count()}'))

        # --- Tasks ---
        task_data = [
            ('Mise à jour du site web', "Refaire la page d'accueil", employees[2], 'in_progress', 'high', 5),
            ('Rapport mensuel RH', 'Préparer le rapport du mois', employees[4], 'todo', 'medium', 7),
            ('Migration base de données', 'Migrer vers PostgreSQL', employees[3], 'done', 'high', -2),
            ('Campagne réseaux sociaux', 'Lancer la campagne Q1', employees[6], 'todo', 'low', 14),
            ('Audit financier', "Préparer les documents d'audit", employees[5], 'in_progress', 'high', 10),
            ('Formation Django', "Organiser la formation équipe", employees[8], 'in_review', 'medium', 3),
            ('Recrutement développeur', 'Publier et trier les CVs', employees[1], 'in_progress', 'high', 7),
            ('Plan de formation annuel', 'Élaborer le plan 2026', employees[1], 'todo', 'medium', 21),
        ]

        for title, desc, assignee, status, priority, due_days in task_data:
            Task.objects.get_or_create(
                title=title,
                defaults={
                    'description': desc,
                    'assignee': assignee,
                    'created_by': rh_user,
                    'status': status,
                    'priority': priority,
                    'due_date': today + timedelta(days=due_days),
                },
            )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Tasks: {Task.objects.count()}'))

        # --- Attendance ---
        for day_offset in range(5):
            d = today - timedelta(days=day_offset)
            if d.weekday() >= 5:
                continue
            for emp in employees:
                if emp.status == 'on_leave':
                    continue
                Attendance.objects.get_or_create(
                    employee=emp,
                    date=d,
                    defaults={
                        'check_in': time(8, 0) if day_offset % 3 != 0 else time(8, 45),
                        'check_out': time(17, 0) if day_offset % 2 == 0 else None,
                        'status': 'present' if day_offset % 3 != 0 else 'late',
                    },
                )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Attendance: {Attendance.objects.count()}'))

        # --- Payroll ---
        months = ['2026-01', '2025-12', '2025-11']
        for month in months:
            for emp in employees:
                Payroll.objects.get_or_create(
                    employee=emp,
                    month=month,
                    defaults={
                        'base_salary': emp.salary,
                        'bonuses': float(emp.salary) * 0.05 if month == '2025-12' else 0,
                        'deductions': float(emp.salary) * 0.1,
                        'status': 'paid' if month != '2026-01' else 'pending',
                    },
                )

        self.stdout.write(self.style.SUCCESS(f'  ✓ Payroll: {Payroll.objects.count()}'))

        # --- Job Offers ---
        job_data = [
            ('Développeur React Senior', 'Informatique', 'Dakar', 'full_time',
             'Nous recherchons un développeur React expérimenté.',
             'React 18\nTypeScript\nTailwind CSS\n3 ans minimum', '800 000 - 1 000 000 FCFA', 'open'),
            ('Stagiaire Data Science', 'Informatique', 'Dakar', 'internship',
             'Stage de 6 mois en data science.',
             'Python\nPandas\nScikit-learn', '150 000 - 250 000 FCFA', 'open'),
            ('Comptable Junior', 'Finance', 'Dakar', 'full_time',
             'Poste de comptable.',
             'BTS Comptabilité\n2 ans\nSAGE', '500 000 - 600 000 FCFA', 'open'),
            ('Chef de projet IT', 'Informatique', 'Dakar', 'full_time',
             'Gestion de projets.',
             'PMP ou Scrum\n5 ans', '1 000 000 - 1 300 000 FCFA', 'closed'),
        ]

        jobs = []
        for title, dept, loc, jtype, desc, reqs, salary, status in job_data:
            job, _ = JobOffer.objects.get_or_create(
                title=title,
                defaults={
                    'department': dept,
                    'location': loc,
                    'job_type': jtype,
                    'description': desc,
                    'requirements': reqs,
                    'salary_range': salary,
                    'status': status,
                    'created_by': rh_user,
                },
            )
            jobs.append(job)

        self.stdout.write(self.style.SUCCESS(f'  ✓ Job Offers: {JobOffer.objects.count()}'))

        # --- Applications ---
        if jobs:
            Application.objects.get_or_create(
                job_offer=jobs[0],
                candidate=candidate_user,
                defaults={
                    'cover_letter': "Je suis très motivé par ce poste et j'ai 4 ans d'expérience en React.",
                    'status': 'reviewing',
                    'matching_score': 85.5,
                    'cv': SimpleUploadedFile('demo_cv.pdf', b'%PDF-1.4 demo', content_type='application/pdf'),
                },
            )
            self.stdout.write(self.style.SUCCESS(f'  ✓ Applications: {Application.objects.count()}'))

        self.stdout.write('')
        self.stdout.write(self.style.SUCCESS('✓ Seed terminé ! Comptes de démo prêts.'))
