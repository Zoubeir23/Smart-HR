# ⚡ Guide de Tests Rapides - Smart-HR

**Temps estimé :** 10 minutes
**Objectif :** Valider que toutes les corrections fonctionnent

---

## 🚀 LANCEMENT

```bash
# Terminal 1 - Backend
cd Backend
source venv/bin/activate  # Linux/Mac OU venv\Scripts\activate (Windows)
python src/manage.py runserver

# Terminal 2 - Frontend
cd Frontend
npm run dev
```

**Ouvrir :** http://localhost:5173

---

## ✅ TEST 1 : AdminDashboard (2 min)

**But :** Vérifier que les données mockées sont remplacées

1. **Login :**
   - Email: `<ADMIN_EMAIL>`
   - Password: `<ADMIN_PASSWORD>`

2. **Vérifications :**
   - [ ] Section "Activité récente" affiche des connexions avec timestamps réels
   - [ ] Section "Vue d'ensemble" affiche un nombre > 0 pour "Utilisateurs"
   - [ ] Section "Vue d'ensemble" affiche "4" pour "Rôles actifs"
   - [ ] Pas de texte "À l'instant" ou "Il y a 2h" (c'étaient des mocks)

**✅ Succès si :** Toutes les données semblent réelles avec dates/heures formatées

---

## ✅ TEST 2 : SecurityPage (2 min)

**But :** Vérifier les logs de connexion

1. **Navigation :**
   - Toujours connecté en Admin
   - Cliquer sur "Sécurité & Logs" (carte dashboard)
   - OU aller directement sur `/security`

2. **Vérifications :**
   - [ ] Section "Connexions récentes" affiche des logs
   - [ ] Chaque log a un timestamp formaté (ex: "08 fév 10:30")
   - [ ] Des badges de rôle sont affichés (ADMIN, RH, etc.)
   - [ ] Pas de texte "2025-02-08 10:30" brut (format amélioré)

**✅ Succès si :** Les logs affichent des connexions réelles avec formatage français

---

## ✅ TEST 3 : HRDashboard (3 min)

**But :** Vérifier graphs et actions congés

1. **Logout puis Login RH :**
   - Cliquer profil → Déconnexion
   - Email: `<RH_EMAIL>`
   - Password: `<RH_PASSWORD>`

2. **Vérifications :**
   - [ ] Graphique "Taux de rétention" affiche 12 mois de données
   - [ ] Jauge "Risque de turnover global" affiche un nombre
   - [ ] Section "Congés en attente" : si congés présents, boutons visibles
   - [ ] Cliquer "Approuver" sur un congé → Toast vert "Congé approuvé"
   - [ ] Cliquer "Refuser" sur un congé → Toast "Congé refusé"

**✅ Succès si :** Graphiques réels + toasts de feedback fonctionnent

---

## ✅ TEST 4 : Création de Tâche (2 min)

**But :** Vérifier formulaire de création

1. **Navigation :**
   - Toujours connecté en RH
   - Menu → Tâches

2. **Actions :**
   - [ ] Cliquer "Nouvelle tâche"
   - [ ] Remplir "Titre": `Test Audit Final`
   - [ ] Sélectionner "Assigné à": Choisir un employé dans la liste
   - [ ] Sélectionner "Priorité": Moyen
   - [ ] Choisir une date d'échéance
   - [ ] Cliquer "Créer"

3. **Vérifications :**
   - [ ] Toast vert "Tâche créée" apparaît
   - [ ] La tâche apparaît dans la colonne "À faire"
   - [ ] L'avatar et le nom de l'assigné sont affichés

**✅ Succès si :** Tâche créée avec succès et visible immédiatement

---

## ✅ TEST 5 : Création de Congé (2 min)

**But :** Vérifier formulaire employé

1. **Logout puis Login Employé :**
   - Cliquer profil → Déconnexion
   - Email: `<EMPLOYEE_EMAIL>`
   - Password: `<EMPLOYEE_PASSWORD>`

2. **Navigation :**
   - Menu → Congés

3. **Actions :**
   - [ ] Cliquer "Nouvelle demande"
   - [ ] Sélectionner "Type de congé": Vacances
   - [ ] Choisir "Date de début": Aujourd'hui
   - [ ] Choisir "Date de fin": Dans 3 jours
   - [ ] Remplir "Motif": `Test audit final`
   - [ ] Cliquer "Soumettre"

4. **Vérifications :**
   - [ ] Toast vert "Demande envoyée" apparaît
   - [ ] La demande apparaît dans la liste avec statut "En attente"

**✅ Succès si :** Congé créé et visible dans la liste

---

## ✅ TEST 6 : Permissions RBAC (1 min)

**But :** Vérifier les guards de sécurité

1. **Toujours connecté en Employé**
2. **Aller sur Dashboard :**
   - [ ] Le bouton "Nouvel employé" NE DOIT PAS être visible
   - [ ] Menu latéral : "Employés" NE DOIT PAS être visible

3. **Logout et Login Admin/RH :**
   - [ ] Le bouton "Nouvel employé" DOIT être visible
   - [ ] Menu : "Employés" DOIT être visible

**✅ Succès si :** Employé ne voit pas les fonctions RH/Admin

---

## 🎯 CHECKLIST FINALE

Après tous les tests :

- [ ] AdminDashboard : Données réelles ✅
- [ ] SecurityPage : Logs réels ✅
- [ ] HRDashboard : Graphiques réels ✅
- [ ] Création tâche : Fonctionne ✅
- [ ] Création congé : Fonctionne ✅
- [ ] RBAC : Permissions correctes ✅

---

## ❌ PROBLÈMES COURANTS

### Erreur 500 lors de `/auth/admin/stats/`
**Cause :** Migrations non appliquées
**Solution :**
```bash
cd Backend
python src/manage.py migrate
```

### "Aucune activité récente" dans AdminDashboard
**Cause :** Aucun utilisateur connecté récemment
**Solution :** Normal si première connexion. Se déconnecter/reconnecter plusieurs fois pour générer de l'activité.

### Graphique RetentionChart vide
**Cause :** Endpoint pas encore appelé
**Solution :** Rafraîchir la page (F5)

### Toast n'apparaît pas
**Cause :** Le composant Toaster n'est pas monté
**Solution :** Vérifier que `<Toaster />` est dans `App.tsx`

---

## 📊 RÉSULTAT ATTENDU

**Si tous les tests passent :**
```
✅ 6/6 Tests réussis
✅ Application 100% fonctionnelle
✅ Aucune donnée mockée
✅ Prêt pour démonstration
```

**Si un test échoue :**
1. Vérifier les logs console navigateur (F12)
2. Vérifier les logs Django terminal backend
3. Vérifier que tous les services sont lancés
4. Consulter `DEPLOYMENT_READY.md` pour dépannage

---

## 🎉 FÉLICITATIONS !

Si tous les tests passent, votre application Smart-HR est **prête pour la production** ! 🚀

**Prochaines étapes :**
1. Enregistrer une vidéo de démonstration
2. Préparer slides de présentation
3. Créer fixtures de données réalistes
4. Déployer sur serveur de staging

---

**Temps total de test :** ~10 minutes
**Dernière mise à jour :** 2026-02-08
