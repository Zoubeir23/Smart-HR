# Guide Administrateur

Le rôle Administrateur (`ADMIN`) a un accès illimité à l'application. Ce rôle est généralement réservé au personnel de la Direction des Systèmes d'Information (DSI) ou au DRH principal.

---

## 1. Gestion des Utilisateurs

L'administration des utilisateurs se fait directement depuis la plateforme, mais peut également être gérée via l'interface d'administration Django.

### Créer un nouvel employé
1. Naviguez vers l'onglet **Employés**.
2. Cliquez sur **Ajouter un employé**.
3. Renseignez les informations essentielles : Prénom, Nom, Email, Département, Poste, Salaire.
4. Par défaut, le mot de passe initial sera généré ou fixé selon la politique de sécurité configurée dans votre entreprise (ex: envoi d'un email d'activation).

### Définir un Manager de Département
Si vous souhaitez qu'un employé puisse valider les congés de ses collègues du même département :
1. Allez sur le profil de l'employé concerné.
2. Basculez l'interrupteur **Est un manager de département** (ou `is_department_manager` depuis le panel d'administration).
3. Cet utilisateur aura désormais la permission partielle sur son département.

---

## 2. L'interface d'Administration Django

Smart-HR s'appuie sur le framework Django. L'interface d'administration back-office est disponible à l'adresse `/admin/`.

1. Connectez-vous avec un compte ayant les privilèges `is_staff=True` et `is_superuser=True`.
2. Depuis ce panel technique, vous pouvez :
    - Gérer les modèles de données complexes (ex: modifier manuellement l'historique d'un employé).
    - Exécuter des actions par lots (Batch actions).
    - Gérer les groupes et permissions avancées.
    - Consulter les logs d'erreurs (si l'application de logging est activée).

> **Avertissement :** Les modifications effectuées via le panneau `/admin/` contournent certaines validations métiers implémentées dans les API React. Utilisez cette interface avec précaution.

---

## 3. Maintenance Technique

En cas d'anomalie sur la plateforme (ex: calculs de la paie incorrects, emails non distribués), vérifiez les points suivants avec votre équipe technique :
- **Celery Workers** : Assurez-vous que les processus Celery traitent bien la file d'attente Redis. Si les emails ne partent pas, le worker est probablement arrêté.
- **Tâches planifiées (Beat)** : Le calcul du risque de Churn s'effectue automatiquement la nuit via `celerybeat`. Vérifiez les logs si le Dashboard n'est pas à jour.
