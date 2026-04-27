# Collection Bruno - Smart HR API

Collection complète pour tester toutes les API de Smart HR.

## 📋 Structure

```
API/
├── env.bru                  # Variables d'environnement
├── Auth/                    # Endpoints d'authentification
│   ├── 01_Login.bru
│   ├── 02_Register_Candidate.bru
│   ├── 03_Verify_OTP.bru
│   ├── 04_Resend_OTP.bru
│   └── 05_Admin_Stats.bru
├── Personnel/               # Gestion du personnel
│   ├── 01_List_Employees.bru
│   ├── 02_Create_Employee.bru
│   ├── 03_List_Departments.bru
│   └── 04_List_Positions.bru
├── Conge/                   # Gestion des congés
├── Tache/                   # Gestion des tâches
├── Presence/                # Gestion de la présence
├── Paiement/                # Gestion des paiements
├── Document/                # Gestion des documents
├── Formation/               # Gestion de la formation
├── Recruitment/             # Recrutement
└── AI/                      # Services IA
```

## 🚀 Configuration

1. **Ouvrir la collection dans Bruno**
   - Ouvrir Bruno
   - Cliquer sur "Open Collection"
   - Sélectionner le dossier `/smart-hr`

2. **Configurer les variables d'environnement**
   - Dans Bruno, configurer les variables:
     - `{{baseUrl}}` : `http://localhost:8000` (développement) ou votre URL de production
     - `{{apiVersion}}` : `v1`
     - `{{authToken}}` : Votre JWT token

## 🔐 Authentification

### Obtenir un token JWT

1. **D'abord, se connecter via Login**
   - Aller à `Auth > 01_Login.bru`
   - Entrer vos identifiants
   - Cliquer sur "Send"

2. **Récupérer le token dans la réponse**
   ```json
   {
     "access": "eyJ0eXAiOiJKV1QiLCJhbGc...",
     "refresh": "eyJ0eXAiOiJKV1QiLCJhbGc..."
   }
   ```

3. **Configurer le token dans l'environnement**
   - Cliquer sur "Environment" en bas à gauche
   - Ajouter la variable: `authToken = votre_token_ici`

## 🧪 Tester les API

### Test rapide de chaque module

#### Auth (Authentification)
- [ ] Login
- [ ] Register Candidate
- [ ] Verify OTP
- [ ] Admin Stats

#### Personnel (Gestion du personnel)
- [ ] List Employees
- [ ] Create Employee
- [ ] List Departments
- [ ] List Positions

#### Conge (Congés)
- [ ] List Leave Requests
- [ ] Create Leave Request

#### Tache (Tâches)
- [ ] List Tasks
- [ ] Create Task

#### Presence (Présence)
- [ ] List Attendance
- [ ] Record Attendance

#### Paiement (Paiements)
- [ ] List Payments
- [ ] Create Payment

#### Document (Documents)
- [ ] List Documents
- [ ] Upload Document

#### Formation (Formation)
- [ ] List Trainings
- [ ] Create Training

#### Recruitment (Recrutement)
- [ ] List Job Postings
- [ ] Create Job Posting

#### AI (Intelligence Artificielle)
- [ ] List AI Models
- [ ] AI Engine Query
- [ ] Voice Ask

## 📝 Notes d'utilisation

### Variables de test
Remplacer les valeurs par défaut par vos données réelles:
- IDs d'objets (employee: 1, department: 1, etc.)
- Emails et noms
- Dates (format: YYYY-MM-DD)
- Fichiers pour les uploads

### Gestion des erreurs
En cas d'erreur lors du test:
1. Vérifier que le serveur Django est en cours d'exécution
2. Vérifier que le token JWT n'a pas expiré
3. Consulter les logs du serveur pour plus de détails

### Mode de débogage
Pour plus de détails sur les requêtes/réponses:
- Ouvrir les outils de développement (F12 dans Bruno)
- Consulter les onglets "Request" et "Response"
- Vérifier les en-têtes HTTP et les codes de statut

## 🔧 Commandes utiles

Démarrer le serveur Django:
```bash
cd Backend
source .venv/bin/activate
python manage.py runserver
```

Accès à l'API Swagger (si configurée):
```
http://localhost:8000/api/schema/swagger/
```

## 📞 Support
Pour toute question ou problème, consulter la documentation du Backend ou contacter l'équipe développement.
