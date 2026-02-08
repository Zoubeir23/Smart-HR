from datetime import datetime

from personnel.models import Employee, Department, Position
from conge.models import LeaveRequest
from paiement.models import Payroll
from presence.models import Attendance
from tache.models import Task
from document.models import Document


def train(question):
    employees = Employee.objects.select_related('user', 'department', 'position').all()
    employees_str = ", ".join([str(e) for e in employees])

    leaves = LeaveRequest.objects.select_related('employee__user').all()
    leaves_str = ", ".join([str(c) for c in leaves])

    payrolls = Payroll.objects.select_related('employee__user').all()
    payrolls_str = ", ".join([str(p) for p in payrolls])

    attendance = Attendance.objects.select_related('employee__user').all()
    attendance_str = ", ".join([str(p) for p in attendance])

    tasks = Task.objects.select_related('assignee__user').all()
    tasks_str = ", ".join([str(t) for t in tasks])

    departments = Department.objects.all()
    departments_str = ", ".join([str(d) for d in departments])

    positions = Position.objects.all()
    positions_str = ", ".join([str(p) for p in positions])

    documents = Document.objects.select_related('employee__user').all()
    documents_str = ", ".join([str(d) for d in documents])

    training_data = f"""Données RH dans base de données pour que tu puisse repondre aux questions concernant les données RH:
    date et heure actuelle : {datetime.now()}
    - Employés : {employees_str}
    - Congés : {leaves_str}
    - Paiements : {payrolls_str}
    - Présences : {attendance_str}
    - Tâches : {tasks_str}
    - Départements : {departments_str}
    - Postes : {positions_str}
    - Documents : {documents_str}

    quand tu réponds en donnant des données il faut les citer comme suit:
    exemple :
    * qui sont les personnes en congé en ce moment?
     - Diane Keaton, debut : 2022-01-01, fin : 2022-01-10, motif : vacances
     - John Doe, debut : 2022-01-01, fin : 2022-01-10, motif : vacances

    Statuts des tâches : todo = "À Faire", in_progress = "En Cours", in_review = "En Revue", done = "Terminée"

    Répond à cette question : {question}
    """
    return training_data
