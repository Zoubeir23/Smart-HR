"""Management command : entraîne le modèle Random Forest de prédiction de churn.

Génère 1 500 samples synthétiques réalistes, entraîne le modèle, et sauve
le fichier .pkl dans ai_engine/ml_models/churn_model.pkl.

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
    """Génère des données synthétiques réalistes pour le churn RH.

    Features (dans l'ordre attendu par _employee_to_features) :
        0. salary        : float  — salaire en FCFA [100_000, 2_000_000]
        1. tenure_years  : float  — ancienneté en années [0, 20]
        2. status_active : int    — 1 si actif, 0 sinon
        3. has_department: int    — 1 si rattaché à un service
        4. has_position  : int    — 1 si un poste est défini

    Logique churn (target = 1 = démission probable) :
        - risque élevé   : salary < 400_000 ET tenure < 3 ans
        - risque moyen   : salary < 600_000 OU tenure < 2 ans (non cumulatif)
        - risque faible  : reste de la population
    """
    salary = rng.uniform(100_000, 2_000_000, n_samples)
    tenure = rng.uniform(0, 20, n_samples)
    status_active = rng.choice([0, 1], n_samples, p=[0.1, 0.9])
    has_department = rng.choice([0, 1], n_samples, p=[0.05, 0.95])
    has_position = rng.choice([0, 1], n_samples, p=[0.08, 0.92])

    # Probabilité de churn selon les features
    churn_proba = np.zeros(n_samples)

    high_risk = (salary < 400_000) & (tenure < 3)
    medium_risk = ~high_risk & ((salary < 600_000) | (tenure < 2))

    churn_proba[high_risk] = rng.uniform(0.65, 0.95, high_risk.sum())
    churn_proba[medium_risk] = rng.uniform(0.25, 0.55, medium_risk.sum())
    churn_proba[~high_risk & ~medium_risk] = rng.uniform(
        0.02,
        0.20,
        (~high_risk & ~medium_risk).sum(),
    )

    # Inactifs ont un risque légèrement plus élevé
    churn_proba[status_active == 0] = np.clip(
        churn_proba[status_active == 0] + 0.15,
        0.0,
        1.0,
    )

    target = (rng.uniform(0, 1, n_samples) < churn_proba).astype(int)

    X = np.column_stack([salary, tenure, status_active, has_department, has_position])
    return X, target


class Command(BaseCommand):
    help = "Entraîne le modèle Random Forest de prédiction de churn et sauve le .pkl."

    def handle(self, *args: object, **options: object) -> None:
        self.stdout.write(
            self.style.MIGRATE_HEADING("=== Entraînement du modèle churn ==="),
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
            self.style.SUCCESS(f"Modele sauvegarde : {MODEL_PATH}"),
        )
