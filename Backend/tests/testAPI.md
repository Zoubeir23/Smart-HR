# Smart-HR — Guide de test des APIs

**Base URL :** `http://localhost:8000`  
**Préfixe :** `/api/v1/`

Pour chaque requête protégée, ajouter le header :
```
Authorization: Bearer <access_token>
```

---

## Authentification

### Obtenir un token (Login)
```
POST http://localhost:8000/api/v1/auth/login/
Content-Type: application/json

{
  "email": "admin@smarthr.com",
  "password": "admin123"
}
```
Réponse : `{ "access": "...", "refresh": "..." }` — copier `access` comme token.

### Comptes de test

| Rôle     | Email                    | Mot de passe  |
|----------|--------------------------|---------------|
| Admin    | admin@smarthr.com        | admin123      |
| RH       | rh@smarthr.com           | rh123         |
| Employé  | employee@smarthr.com     | employee123   |
| Candidat | candidate@smarthr.com    | candidate123  |

### Rafraîchir le token
```
POST http://localhost:8000/api/v1/auth/token/refresh/
Content-Type: application/json

{ "refresh": "<refresh_token>" }
```

### Inscription candidat
```
POST http://localhost:8000/api/v1/auth/register/candidate/
Content-Type: application/json

{
  "email": "nouveau@example.com",
  "username": "nouveau_candidat",
  "first_name": "Prénom",
  "last_name": "Nom",
  "password": "MotDePasse123!",
  "password2": "MotDePasse123!"
}
```

### Vérifier OTP
```
POST http://localhost:8000/api/v1/auth/verify-otp/
Authorization: Bearer <token>
Content-Type: application/json

{ "code": "123456" }
```

### Renvoyer OTP
```
POST http://localhost:8000/api/v1/auth/resend-otp/
Authorization: Bearer <token>
```

### Statistiques admin
```
GET http://localhost:8000/api/v1/auth/admin/stats/
Authorization: Bearer <token>
```

---

## Personnel

### Lister les employés
```
GET http://localhost:8000/api/v1/personnel/employees/
Authorization: Bearer <token>
```

### Détail d'un employé
```
GET http://localhost:8000/api/v1/personnel/employees/1/
Authorization: Bearer <token>
```

### Mon profil employé
```
GET http://localhost:8000/api/v1/personnel/employees/me/
Authorization: Bearer <token>
```

### Créer un employé (RH/Admin)
```
POST http://localhost:8000/api/v1/personnel/employees/
Authorization: Bearer <token>
Content-Type: application/json

{
  "user": 1,
  "department": 1,
  "position": 1,
  "hire_date": "2024-01-15",
  "salary": 500000,
  "status": "active",
  "date_of_birth": "1990-05-20",
  "cin": "1234567890123",
  "address": "Dakar, Sénégal",
  "emergency_contact": "+221 77 000 0000"
}
```

### Modifier un employé
```
PATCH http://localhost:8000/api/v1/personnel/employees/1/
Authorization: Bearer <token>
Content-Type: application/json

{ "salary": 600000, "status": "active" }
```

### Statistiques employés
```
GET http://localhost:8000/api/v1/personnel/employees/stats/
Authorization: Bearer <token>
```

### Statistiques de rétention
```
GET http://localhost:8000/api/v1/personnel/employees/retention-stats/
Authorization: Bearer <token>
```

### Utilisateurs disponibles (sans profil employé)
```
GET http://localhost:8000/api/v1/personnel/employees/available-users/
Authorization: Bearer <token>
```

### Lister les départements
```
GET http://localhost:8000/api/v1/personnel/departments/
Authorization: Bearer <token>
```

### Créer un département
```
POST http://localhost:8000/api/v1/personnel/departments/
Authorization: Bearer <token>
Content-Type: application/json

{ "name": "Technologie" }
```

### Lister les postes
```
GET http://localhost:8000/api/v1/personnel/positions/
Authorization: Bearer <token>
```

### Créer un poste
```
POST http://localhost:8000/api/v1/personnel/positions/
Authorization: Bearer <token>
Content-Type: application/json

{ "title": "Développeur Backend", "department": 1 }
```

---

## Congés

### Lister les demandes de congé
```
GET http://localhost:8000/api/v1/conge/leave-requests/
Authorization: Bearer <token>
```

### Créer une demande de congé
```
POST http://localhost:8000/api/v1/conge/leave-requests/
Authorization: Bearer <token>
Content-Type: application/json

{
  "leave_type": "vacation",
  "start_date": "2025-06-01",
  "end_date": "2025-06-10",
  "reason": "Vacances d'été"
}
```
Types disponibles : `vacation` `sick` `personal` `maternity` `other`

### Approuver une demande (RH/Admin)
```
POST http://localhost:8000/api/v1/conge/leave-requests/1/approve/
Authorization: Bearer <token>
```

### Rejeter une demande (RH/Admin)
```
POST http://localhost:8000/api/v1/conge/leave-requests/1/reject/
Authorization: Bearer <token>
```

---

## Tâches

### Lister les tâches
```
GET http://localhost:8000/api/v1/tache/tasks/
Authorization: Bearer <token>
```

### Créer une tâche
```
POST http://localhost:8000/api/v1/tache/tasks/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Préparer le rapport mensuel",
  "description": "Rapport des KPIs d'avril",
  "assignee": 1,
  "status": "todo",
  "priority": "high",
  "due_date": "2025-04-30"
}
```
Statuts : `todo` `in_progress` `done`  
Priorités : `low` `medium` `high`

### Modifier le statut d'une tâche
```
PATCH http://localhost:8000/api/v1/tache/tasks/1/
Authorization: Bearer <token>
Content-Type: application/json

{ "status": "in_progress" }
```

---

## Présences

### Lister les présences
```
GET http://localhost:8000/api/v1/presence/attendances/
Authorization: Bearer <token>
```

### Enregistrer une présence
```
POST http://localhost:8000/api/v1/presence/attendances/
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee": 1,
  "date": "2025-04-25",
  "check_in": "08:00:00",
  "check_out": "17:00:00",
  "status": "present"
}
```
Statuts : `present` `absent` `late` `half_day`

---

## Paiements

### Lister les fiches de paie
```
GET http://localhost:8000/api/v1/paiement/payrolls/
Authorization: Bearer <token>
```

### Créer une fiche de paie (RH/Admin)
```
POST http://localhost:8000/api/v1/paiement/payrolls/
Authorization: Bearer <token>
Content-Type: application/json

{
  "employee": 1,
  "month": "2025-04",
  "base_salary": 500000,
  "bonuses": 50000,
  "deductions": 30000,
  "status": "pending"
}
```
Statuts : `pending` `processed` `paid`

---

## Documents

### Lister les documents
```
GET http://localhost:8000/api/v1/document/documents/
Authorization: Bearer <token>
```

### Uploader un document
```
POST http://localhost:8000/api/v1/document/documents/
Authorization: Bearer <token>
Content-Type: multipart/form-data

file=<fichier>
employee=1
document_type=contract
```

---

## Formations & Réunions

### Lister les formations
```
GET http://localhost:8000/api/v1/formation/formations/
Authorization: Bearer <token>
```

### Créer une formation
```
POST http://localhost:8000/api/v1/formation/formations/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Formation Django REST Framework",
  "description": "Introduction aux APIs REST avec Django",
  "date": "2025-05-10",
  "duration": 8
}
```

### Lister les réunions
```
GET http://localhost:8000/api/v1/formation/meetings/
Authorization: Bearer <token>
```

### Créer une réunion
```
POST http://localhost:8000/api/v1/formation/meetings/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Réunion RH mensuelle",
  "date": "2025-05-05",
  "duration": 60,
  "participants": [1, 2, 3]
}
```

---

## Recrutement

### Lister les offres d'emploi
```
GET http://localhost:8000/api/v1/recruitment/job-offers/
Authorization: Bearer <token>
```

### Créer une offre d'emploi (RH/Admin)
```
POST http://localhost:8000/api/v1/recruitment/job-offers/
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Développeur Backend Django",
  "department": "Technologie",
  "location": "Dakar",
  "type": "full_time",
  "description": "Nous recherchons un développeur Django expérimenté.",
  "requirements": ["Python", "Django", "PostgreSQL"],
  "status": "open"
}
```
Types : `full_time` `part_time` `contract` `internship`

### Lister les candidatures
```
GET http://localhost:8000/api/v1/recruitment/applications/
Authorization: Bearer <token>
```

### Postuler à une offre (Candidat)
```
POST http://localhost:8000/api/v1/recruitment/applications/
Authorization: Bearer <token>
Content-Type: multipart/form-data

job_offer=1
cv=<fichier_pdf>
cover_letter=Lettre de motivation...
```

---

## Intelligence Artificielle

### Chat IA (tous rôles)
```
POST http://localhost:8000/api/v1/ai/chat/
Authorization: Bearer <token>
Content-Type: application/json

{ "question": "Combien d'employés sont à risque de départ ?" }
```
Limite : 1000 caractères par question.

### Historique des conversations
```
GET http://localhost:8000/api/v1/ai/chat/
Authorization: Bearer <token>
```

### Prédiction de churn (RH/Admin)
```
GET http://localhost:8000/api/v1/ai-engine/churn-predictions/
Authorization: Bearer <token>
```

### Assistant vocal
```
POST http://localhost:8000/api/v1/agents/voice/ask/
Authorization: Bearer <token>
Content-Type: application/json

{ "question": "Quelle est la politique de congés ?" }
```
