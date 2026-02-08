"""
Seed data script for Smart-HR.
Run: python manage.py shell < seed_data.py
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_taches.settings')
django.setup()

from datetime import date, time, timedelta
from django.contrib.auth import get_user_model
from personnel.models import Department, Position, Employee
from conge.models import LeaveRequest
from tache.models import Task
from presence.models import Attendance
from paiement.models import Payroll
from recruitment.models import JobOffer, Application

User = get_user_model()

print("Seeding database...")

# --- Users ---
admin_user, _ = User.objects.get_or_create(
    email='admin@smarthr.com',
    defaults={
        'username': 'admin',
        'first_name': 'Amadou',
        'last_name': 'Diallo',
        'role': 'ADMIN',
        'is_staff': True,
        'is_superuser': True,
    }
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
    }
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
    }
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
    }
)
candidate_user.set_password('candidate123')
candidate_user.save()

# Extra employees
extra_users = []
for i, (fn, ln, email) in enumerate([
    ('Ibrahima', 'Fall', 'ibrahima.fall@smarthr.com'),
    ('Mariama', 'Diop', 'mariama.diop@smarthr.com'),
    ('Ousmane', 'Sy', 'ousmane.sy@smarthr.com'),
    ('Khady', 'Mbaye', 'khady.mbaye@smarthr.com'),
    ('Cheikh', 'Gueye', 'cheikh.gueye@smarthr.com'),
    ('Ndeye', 'Sarr', 'ndeye.sarr@smarthr.com'),
]):
    u, _ = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0].replace('.', '_'),
            'first_name': fn,
            'last_name': ln,
            'role': 'EMPLOYEE',
        }
    )
    u.set_password('employee123')
    u.save()
    extra_users.append(u)

print(f"  Created {User.objects.count()} users")

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

print(f"  Created {Department.objects.count()} departments")

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
        defaults={'department': departments.get(dept_name)}
    )
    positions[title] = pos

print(f"  Created {Position.objects.count()} positions")

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
        }
    )
    employees.append(emp)

print(f"  Created {Employee.objects.count()} employees")

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
        }
    )

print(f"  Created {LeaveRequest.objects.count()} leave requests")

# --- Tasks ---
task_data = [
    ('Mise à jour du site web', 'Refaire la page d\'accueil', employees[2], 'in_progress', 'high', 5),
    ('Rapport mensuel RH', 'Préparer le rapport du mois', employees[4], 'todo', 'medium', 7),
    ('Migration base de données', 'Migrer vers PostgreSQL', employees[3], 'done', 'high', -2),
    ('Campagne réseaux sociaux', 'Lancer la campagne Q1', employees[6], 'todo', 'low', 14),
    ('Audit financier', 'Préparer les documents d\'audit', employees[5], 'in_progress', 'high', 10),
    ('Formation Django', 'Organiser la formation équipe', employees[8], 'in_review', 'medium', 3),
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
        }
    )

print(f"  Created {Task.objects.count()} tasks")

# --- Attendance (last 5 days) ---
for day_offset in range(5):
    d = today - timedelta(days=day_offset)
    if d.weekday() >= 5:  # Skip weekends
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
            }
        )

print(f"  Created {Attendance.objects.count()} attendance records")

# --- Payroll (last 3 months) ---
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
            }
        )

print(f"  Created {Payroll.objects.count()} payroll records")

# --- Job Offers ---
job_data = [
    ('Développeur React Senior', 'Informatique', 'Dakar', 'full_time',
     'Nous recherchons un développeur React expérimenté pour rejoindre notre équipe.',
     'React 18\nTypeScript\nTailwind CSS\n3 ans d\'expérience minimum', '800 000 - 1 000 000 FCFA', 'open'),
    ('Stagiaire Data Science', 'Informatique', 'Dakar', 'internship',
     'Stage de 6 mois en data science et machine learning.',
     'Python\nPandas\nScikit-learn\nÉtudiant en informatique', '150 000 - 250 000 FCFA', 'open'),
    ('Comptable Junior', 'Finance', 'Dakar', 'full_time',
     'Poste de comptable pour renforcer l\'équipe finance.',
     'BTS Comptabilité\n2 ans d\'expérience\nSAGE', '500 000 - 600 000 FCFA', 'open'),
    ('Chef de projet IT', 'Informatique', 'Dakar', 'full_time',
     'Gestion de projets de développement logiciel.',
     'PMP ou Scrum Master\n5 ans d\'expérience\nGestion d\'équipe', '1 000 000 - 1 300 000 FCFA', 'closed'),
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
        }
    )
    jobs.append(job)

print(f"  Created {JobOffer.objects.count()} job offers")

# --- Applications ---
if jobs:
    Application.objects.get_or_create(
        job_offer=jobs[0],
        candidate=candidate_user,
        defaults={
            'cover_letter': 'Je suis très motivé par ce poste et j\'ai 4 ans d\'expérience en React.',
            'status': 'reviewing',
            'matching_score': 85.5,
        }
    )

print(f"  Created {Application.objects.count()} applications")

print("\nSeed data complete!")
print(f"  Users: {User.objects.count()}")
print(f"  Employees: {Employee.objects.count()}")
print(f"  Departments: {Department.objects.count()}")
print(f"  Positions: {Position.objects.count()}")
print(f"  Leave Requests: {LeaveRequest.objects.count()}")
print(f"  Tasks: {Task.objects.count()}")
print(f"  Attendance: {Attendance.objects.count()}")
print(f"  Payroll: {Payroll.objects.count()}")
print(f"  Job Offers: {JobOffer.objects.count()}")
print(f"  Applications: {Application.objects.count()}")
