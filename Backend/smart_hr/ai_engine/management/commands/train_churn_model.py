"""Management command : entraîne le modèle Random Forest de prédiction de churn.

Génère 1 500 samples synthétiques basés sur les features réelles de l'application,
entraîne le modèle, et sauve le fichier .pkl dans ai_engine/ml_models/churn_model.pkl.

Features utilisées (dans l'ordre attendu par _employee_to_features) :
    0. salary                — salaire en FCFA
    1. tenure_years          — ancienneté en années
    2. leave_count           — congés approuvés (12 derniers mois)
    3. absence_count         — absences (12 derniers mois)
    4. disciplinary_count    — actions disciplinaires totales
    5. avg_performance_score — score de performance moyen (0-100)
    6. unpaid_payroll_count  — fiches de paie non payées

Usage :
    python manage.py train_churn_model
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
from django.core.management.base import BaseCommand
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split

MODEL_PATH: Path = Path(__file__).resolve().parent.parent.parent / "ml_models" / "churn_model.pkl"

N_SAMPLES = 1_500
RANDOM_STATE = 42


def _generate_synthetic_data(
    n_samples: int,
    rng: np.random.Generator,
) -> tuple[np.ndarray, np.ndarray]:
    """Génère des données synthétiques réalistes basées sur les 7 features réelles.

    Logique churn (target = 1 = démission probable) :
        - Risque élevé   : salaire bas ET ancienneté courte
        - Risque élevé   : absences fréquentes OU actions disciplinaires
        - Risque élevé   : performance faible ET fiches impayées
        - Risque faible  : salaire correct + ancienneté longue + bonne performance
    """
    # salary : FCFA [100_000, 2_000_000]
    salary = rng.uniform(100_000, 2_000_000, n_samples)
    # tenure_years : [0, 20]
    tenure_years = rng.uniform(0, 20, n_samples)
    # leave_count : [0, 15] congés approuvés sur 12 mois
    leave_count = rng.integers(0, 16, n_samples).astype(float)
    # absence_count : [0, 20] absences sur 12 mois
    absence_count = rng.integers(0, 21, n_samples).astype(float)
    # disciplinary_count : [0, 5]
    disciplinary_count = rng.integers(0, 6, n_samples).astype(float)
    # avg_performance_score : [0, 100]
    avg_performance_score = rng.uniform(0, 100, n_samples)
    # unpaid_payroll_count : [0, 6]
    unpaid_payroll_count = rng.integers(0, 7, n_samples).astype(float)

    # Probabilité de churn selon combinaison de facteurs
    churn_proba = np.zeros(n_samples)

    # Facteur 1 : salaire bas + ancienneté courte → risque fort
    low_salary_new = (salary < 400_000) & (tenure_years < 3)
    churn_proba[low_salary_new] += rng.uniform(0.35, 0.55, low_salary_new.sum())

    # Facteur 2 : absences fréquentes (> 5/an) → signal fort de désengagement
    high_absence = absence_count > 5
    churn_proba[high_absence] += rng.uniform(0.20, 0.40, high_absence.sum())

    # Facteur 3 : actions disciplinaires (> 1) → instabilité
    has_discipline = disciplinary_count > 1
    churn_proba[has_discipline] += rng.uniform(0.15, 0.30, has_discipline.sum())

    # Facteur 4 : performance faible (< 40) → frustration
    low_perf = avg_performance_score < 40
    churn_proba[low_perf] += rng.uniform(0.10, 0.25, low_perf.sum())

    # Facteur 5 : fiches impayées (> 2) → insatisfaction financière
    unpaid = unpaid_payroll_count > 2
    churn_proba[unpaid] += rng.uniform(0.15, 0.30, unpaid.sum())

    # Facteur 6 : salaire moyen + ancienneté courte → risque modéré
    medium_risk = ~low_salary_new & (salary < 600_000) & (tenure_years < 2)
    churn_proba[medium_risk] += rng.uniform(0.10, 0.20, medium_risk.sum())

    # Bruit de base : tout le monde a un risque minimum
    churn_proba += rng.uniform(0.01, 0.08, n_samples)

    # Clamp [0, 1]
    churn_proba = np.clip(churn_proba, 0.0, 1.0)

    target = (rng.uniform(0, 1, n_samples) < churn_proba).astype(int)

    X = np.column_stack(
        [
            salary,
            tenure_years,
            leave_count,
            absence_count,
            disciplinary_count,
            avg_performance_score,
            unpaid_payroll_count,
        ]
    )
    return X, target


class Command(BaseCommand):
    help = "Entraîne le modèle Random Forest de prédiction de churn et sauve le .pkl."

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write(
            self.style.MIGRATE_HEADING("=== Entraînement du modèle churn (7 features réelles) ==="),
        )

        rng = np.random.default_rng(RANDOM_STATE)
        X, y = _generate_synthetic_data(N_SAMPLES, rng)

        self.stdout.write(
            f"Données générées : {N_SAMPLES} samples | churn rate = {y.mean():.1%}",
        )

        X_train, X_test, y_train, y_test = train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=RANDOM_STATE,
            stratify=y,
        )

        model = RandomForestClassifier(
            n_estimators=100,
            random_state=RANDOM_STATE,
            n_jobs=-1,
        )
        model.fit(X_train, y_train)

        accuracy = model.score(X_test, y_test)
        self.stdout.write(f"Accuracy (test set) : {accuracy:.4f}")

        report = classification_report(
            y_test,
            model.predict(X_test),
            target_names=["reste", "part"],
        )
        self.stdout.write("\nClassification report :")
        self.stdout.write(report)

        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)

        self.stdout.write(
            self.style.SUCCESS(f"Modèle sauvegardé : {MODEL_PATH}"),
        )
