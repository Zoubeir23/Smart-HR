#!/usr/bin/env python
"""
Script de vérification de santé du backend Smart-HR
Vérifie que tous les endpoints critiques sont accessibles
"""

import os
import sys
import django

# Setup Django
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'src'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'gestion_taches.settings')
django.setup()

from django.contrib.auth import get_user_model
from personnel.models import Employee, Department, Position
from conge.models import LeaveRequest
from tache.models import Task

User = get_user_model()

def check_database():
    """Vérifie la connexion à la base de données"""
    print("🔍 Vérification de la base de données...")
    try:
        user_count = User.objects.count()
        print(f"   ✅ Utilisateurs : {user_count}")

        emp_count = Employee.objects.count()
        print(f"   ✅ Employés : {emp_count}")

        dept_count = Department.objects.count()
        print(f"   ✅ Départements : {dept_count}")

        return True
    except Exception as e:
        print(f"   ❌ Erreur : {e}")
        return False

def check_models():
    """Vérifie que les modèles principaux existent"""
    print("\n🔍 Vérification des modèles...")

    models_to_check = [
        ('User', User),
        ('Employee', Employee),
        ('Department', Department),
        ('Position', Position),
        ('LeaveRequest', LeaveRequest),
        ('Task', Task),
    ]

    all_ok = True
    for name, model in models_to_check:
        try:
            count = model.objects.count()
            print(f"   ✅ {name} : {count} entrées")
        except Exception as e:
            print(f"   ❌ {name} : Erreur - {e}")
            all_ok = False

    return all_ok

def check_test_users():
    """Vérifie que les utilisateurs de test existent"""
    print("\n🔍 Vérification des comptes de test...")

    test_emails = [
        'admin@smarthr.com',
        'rh@smarthr.com',
        'employee@smarthr.com',
        'candidate@smarthr.com',
    ]

    all_ok = True
    for email in test_emails:
        exists = User.objects.filter(email=email).exists()
        status = "✅" if exists else "❌"
        print(f"   {status} {email}")
        if not exists:
            all_ok = False

    return all_ok

def check_endpoints():
    """Vérifie que les URLs sont bien configurées"""
    print("\n🔍 Vérification des URLs...")

    try:
        from django.urls import get_resolver
        from django.urls.exceptions import Resolver404

        urls_to_check = [
            '/api/auth/login/',
            '/api/personnel/employees/',
            '/api/personnel/employees/stats/',
            '/api/personnel/employees/retention_stats/',
            '/api/conges/leaves/',
            '/api/taches/tasks/',
            '/api/ai-engine/predictions/',
            '/api/genai/chat/',
        ]

        resolver = get_resolver()
        all_ok = True

        for url in urls_to_check:
            try:
                resolver.resolve(url)
                print(f"   ✅ {url}")
            except Resolver404:
                print(f"   ❌ {url} - Non trouvée")
                all_ok = False

        return all_ok
    except Exception as e:
        print(f"   ❌ Erreur : {e}")
        return False

def check_settings():
    """Vérifie les settings critiques"""
    print("\n🔍 Vérification des settings...")

    from django.conf import settings

    checks = [
        ('SECRET_KEY', hasattr(settings, 'SECRET_KEY') and settings.SECRET_KEY != 'CHANGE-ME'),
        ('DEBUG', hasattr(settings, 'DEBUG')),
        ('DATABASES', 'default' in settings.DATABASES),
        ('INSTALLED_APPS', 'personnel' in settings.INSTALLED_APPS),
        ('REST_FRAMEWORK', hasattr(settings, 'REST_FRAMEWORK')),
    ]

    all_ok = True
    for name, check in checks:
        status = "✅" if check else "❌"
        print(f"   {status} {name}")
        if not check:
            all_ok = False

    return all_ok

def main():
    print("=" * 60)
    print("🏥 SMART-HR - Vérification de Santé du Backend")
    print("=" * 60)

    checks = [
        check_database(),
        check_models(),
        check_test_users(),
        check_endpoints(),
        check_settings(),
    ]

    print("\n" + "=" * 60)
    if all(checks):
        print("✅ TOUS LES TESTS SONT PASSÉS - BACKEND PRÊT!")
    else:
        print("❌ CERTAINS TESTS ONT ÉCHOUÉ - Vérifiez les erreurs ci-dessus")
    print("=" * 60)

    return 0 if all(checks) else 1

if __name__ == '__main__':
    sys.exit(main())
