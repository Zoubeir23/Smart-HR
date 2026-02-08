import joblib
import numpy as np
from pathlib import Path
from datetime import date

MODEL_PATH = Path(__file__).parent.parent / 'ml_models' / 'churn_model.pkl'
FEATURES_PATH = Path(__file__).parent.parent / 'ml_models' / 'feature_names.pkl'

_model = None
_feature_names = None

def _load_model():
    global _model, _feature_names
    if _model is None:
        try:
            _model = joblib.load(MODEL_PATH)
            _feature_names = joblib.load(FEATURES_PATH)
        except FileNotFoundError:
            pass
    return _model, _feature_names

def predict_churn(employee):
    model, feature_names = _load_model()
    if model is None:
        return _mock_predict()

    features = _extract_features(employee)
    feature_array = np.array([features.get(f, 0) for f in feature_names]).reshape(1, -1)
    proba = model.predict_proba(feature_array)[0][1]
    score = round(proba * 100, 1)

    factors, recommendations = _explain_prediction(model, feature_names, features, score)
    level = 'high' if score >= 70 else 'medium' if score >= 40 else 'low'

    return {
        'risk_score': score,
        'risk_level': level,
        'factors': factors,
        'recommendations': recommendations,
    }

def _extract_features(employee):
    """Map Employee model fields to IBM dataset features."""
    from datetime import date
    today = date.today()

    # Calculate years at company from hire_date
    years_at_company = 0
    if employee.hire_date:
        years_at_company = (today - employee.hire_date).days / 365.25

    # Calculate age (use a default if no birth date)
    age = 35  # default

    # Get salary
    salary = float(employee.salary) if employee.salary else 50000

    return {
        'Age': age,
        'MonthlyIncome': salary / 12,  # Annual to monthly
        'YearsAtCompany': round(years_at_company, 1),
        'OverTime': 0,  # Default: no overtime
        'JobSatisfaction': 3,  # Default: good
        'EnvironmentSatisfaction': 3,
        'WorkLifeBalance': 3,
        'NumCompaniesWorked': 2,  # Default
        'TotalWorkingYears': round(years_at_company + 5, 1),
        'YearsInCurrentRole': round(years_at_company * 0.7, 1),
        'YearsSinceLastPromotion': round(years_at_company * 0.3, 1),
        'YearsWithCurrManager': round(years_at_company * 0.5, 1),
        'DistanceFromHome': 10,  # Default
        'Department_Human Resources': 1 if (employee.department and 'Humain' in str(employee.department)) else 0,
        'Department_Research & Development': 0,
        'Department_Sales': 1 if (employee.department and 'Market' in str(employee.department)) else 0,
    }

def _explain_prediction(model, feature_names, features, score):
    """Generate human-readable explanations from feature importances."""
    importances = model.feature_importances_
    feature_importance_pairs = list(zip(feature_names, importances))
    feature_importance_pairs.sort(key=lambda x: x[1], reverse=True)

    FACTOR_LABELS = {
        'MonthlyIncome': ('Niveau de salaire', 'Envisager une revalorisation salariale'),
        'Age': ("Tranche d'âge", "Adapter les avantages selon le profil"),
        'YearsAtCompany': ("Ancienneté dans l'entreprise", "Proposer un programme de fidélisation"),
        'OverTime': ('Heures supplémentaires', 'Réduire la charge de travail'),
        'JobSatisfaction': ('Satisfaction au travail', 'Planifier un entretien de suivi'),
        'EnvironmentSatisfaction': ("Satisfaction de l'environnement", "Améliorer les conditions de travail"),
        'WorkLifeBalance': ('Équilibre vie pro/perso', 'Proposer du télétravail ou horaires flexibles'),
        'NumCompaniesWorked': ("Mobilité professionnelle", "Renforcer l'engagement via des projets stimulants"),
        'TotalWorkingYears': ("Expérience totale", "Valoriser l'expertise par du mentorat"),
        'YearsInCurrentRole': ('Ancienneté dans le poste', 'Proposer une évolution de poste'),
        'YearsSinceLastPromotion': ('Temps depuis dernière promotion', 'Évaluer une promotion'),
        'YearsWithCurrManager': ('Relation avec le manager', 'Organiser un feedback 360°'),
        'DistanceFromHome': ('Distance domicile-travail', 'Proposer du télétravail'),
    }

    factors = []
    recommendations = []
    for feat, imp in feature_importance_pairs[:3]:
        base_feat = feat.replace('Department_', '')
        if feat in FACTOR_LABELS:
            label, rec = FACTOR_LABELS[feat]
            factors.append(label)
            recommendations.append(rec)
        elif 'Department' in feat:
            factors.append(f'Département: {base_feat}')
            recommendations.append('Analyser les conditions du département')

    if not factors:
        factors = ['Profil général à risque']
        recommendations = ['Planifier un entretien individuel']

    return factors, recommendations

def _mock_predict():
    """Fallback when model is not available."""
    import random
    score = round(random.uniform(5, 95), 1)
    if score >= 70:
        level = 'high'
        factors = ['Salaire inférieur à la moyenne', 'Ancienneté faible', 'Heures supplémentaires élevées']
        recommendations = ['Envisager une augmentation de salaire', 'Proposer un programme de mentorat', 'Réduire la charge de travail']
    elif score >= 40:
        level = 'medium'
        factors = ['Satisfaction moyenne', 'Peu de promotions récentes']
        recommendations = ['Planifier un entretien de suivi', 'Proposer des formations']
    else:
        level = 'low'
        factors = ['Bonne satisfaction', 'Salaire compétitif']
        recommendations = ['Maintenir les conditions actuelles']
    return {'risk_score': score, 'risk_level': level, 'factors': factors, 'recommendations': recommendations}
