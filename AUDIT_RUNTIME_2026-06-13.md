# Rapport d'Audit Runtime — Smart-HR

**Date :** 13 juin 2026
**Branche :** `Feature/104-feat-contrats-profil-swagger-dashboard-churn`
**Méthode :** audit dynamique réel — serveurs Django (`:8000`) + Vite (`:8080`) lancés, base PostgreSQL peuplée (`seed_demo_data`), pilotage du navigateur via Claude in Chrome, et appels API directs (curl). Pas d'analyse purement statique.

---

## 1. Synthèse

Contrairement à un audit statique (qui ressortait « projet sain »), l'exécution réelle a révélé **plusieurs bugs bloquants invisibles aux outils** (tsc, ruff, eslint, tests). La couverture de tests étant mince, ces bugs fonctionnels passaient inaperçus. Tous corrigés et **vérifiés de bout en bout**.

| # | Sévérité | Bug | Statut |
|---|----------|-----|--------|
| 1 | 🔴 CRITIQUE | 2 migrations jamais appliquées → toute requête Employee plantait | ✅ Corrigé |
| 2 | 🔴 CRITIQUE | Email/OTP : envoi court-circuité en dev (~12 flux cassés) | ✅ Corrigé |
| 3 | 🟠 MAJEUR | Dashboard RH : KPI à 0 (désalignement contrat front/back) | ✅ Corrigé |
| 4 | 🟠 MAJEUR | Filtre `?status=` des congés ignoré (renvoyait tout) | ✅ Corrigé |
| 5 | 🟠 MAJEUR | `ProtectedMediaView` : tout user lit tout fichier (IDOR) | ✅ Corrigé |
| 6 | 🟡 MOYEN | Test frontend cassé (localStorage / Node 25) | ✅ Corrigé |
| 7 | 🟢 MINEUR | Code mort (`return success` dupliqué) | ✅ Corrigé |

---

## 2. Détail des bugs

### 🔴 #1 — Migrations non appliquées (CRITIQUE)
La base locale n'avait pas `personnel.0004_add_is_department_manager` ni `users.0005_hash_otp_code_field`.
**Symptôme runtime :** `ProgrammingError: column personnel_employee.is_department_manager does not exist` → pages Employés, Dashboard, Congés en erreur 500.
**Fix :** `manage.py migrate`. Action requise aussi en production/CI (étape migrate obligatoire au déploiement).

### 🔴 #2 — Email/OTP court-circuité en dev (CRITIQUE)
`EmailService(prod=not settings.DEBUG)` : en dev (`DEBUG=True`), `prod=False` → la méthode renvoyait `True` **sans envoyer**, et le code OTP n'était pas loggué. Tous les emails morts en dev malgré Gmail SMTP configuré.
**Flux impactés :** OTP, identifiants employé, notif congés, candidatures, alerte churn, invitation entretien IA, réunions, fiches de paie.
**Fix :** envoi via le backend email configuré par Django ; `local.py` bascule sur console si pas d'identifiants ; code OTP loggué en `DEBUG`.
**Vérifié :** register → verify OTP → login = **HTTP 201 → 200 → 200** (token obtenu).

### 🟠 #3 — Dashboard RH : KPI à 0 (MAJEUR)
Le frontend lit `stats.active_employees`, `pending_leaves`, `open_positions`, `new_applications`, `churn_risk_high`. L'endpoint `/personnel/employees/stats/` renvoyait `by_status`, `high_churn_risk`, etc. — noms différents → toutes les cartes à 0.
**Fix :** l'endpoint renvoie désormais les champs à plat attendus.
**Vérifié visuellement :** cartes passées de « 0 actifs / 0 congés / 0 postes » à **15 actifs / 3 congés en attente / 5 postes / 1 candidature**.

### 🟠 #4 — Filtre statut des congés ignoré (MAJEUR)
`GET /conge/leave-requests/?status=pending` renvoyait les 10 demandes (tous statuts). `get_queryset` ne lisait pas le query param.
**Fix :** filtrage par `status` validé contre les choix du modèle.
**Vérifié :** renvoie désormais 3 demandes, toutes `pending`.

### 🟠 #5 — IDOR sur les fichiers media (MAJEUR, sécurité)
`ProtectedMediaView` n'exigeait qu'une authentification : tout utilisateur connecté (y compris un candidat) pouvait télécharger n'importe quel contrat, fiche de paie ou CV en connaissant le chemin (noms de fichiers prévisibles car `upload_to` conserve le nom d'origine).
**Fix :** autorisation par fichier — propriétaire (candidat pour son CV, employé pour ses documents) ou RH/Admin.

### 🟡 #6 — Test frontend cassé
`LoginPage.test.tsx` : `localStorage.getItem is not a function` (Node 25 masque le localStorage de jsdom).
**Fix :** mock déterministe dans `src/test/setup.ts`. 6/6 tests verts.

### 🟢 #7 — Code mort
`return success` dupliqué en fin de `email_service.py`. Supprimé.

---

## 3. Ce qui a été validé comme FONCTIONNEL

- **Authentification** : login RH/Admin/Employé/Candidat (JWT), OTP candidat complet.
- **Dashboard RH** : KPIs, graphiques, après correction.
- **Employés** : liste (15), filtres, cartes avec score de risque de départ.
- **Congés** : liste avec statuts + actions Valider/Refuser.
- **RBAC API** : `get_queryset` filtre par rôle sur Document, Payroll, Employee, Application (pas d'IDOR API).
- **Sécurité** : pas de secrets en dur ; uploads validés (extension/taille/content_type) ; path traversal protégé ; settings prod solides (SSL/HSTS/nosniff/CORS scopé) ; anti-bruteforce OTP ; sanitation prompt injection (entretien IA).

## 4. Limites de cet audit

- **Agents IA** (Gemini, Zoom, vocal) non testés en réel (dépendent de clés API externes).
- Audit visuel par page partiellement gêné par le HMR Vite (`document_idle`) ; complété par capture réseau/console (tous endpoints 200, 0 erreur console).
- **Couverture de tests à renforcer** (25 backend, 6 frontend) : c'est l'absence de tests d'intégration qui a laissé passer #3 et #4.

## 5. Fichiers modifiés

```
Backend/smart_hr/core/email_service.py          (#2, #7)
Backend/config/settings/local.py                (#2)
Backend/smart_hr/core/protected_media.py        (#5)
Backend/smart_hr/personnel/views/employee.py    (#3)
Backend/smart_hr/conge/views/leave_request.py   (#4)
Frontend/src/test/setup.ts                       (#6)
+ DB : migrations appliquées (#1)
```

## 6. Recommandations

1. **CI/CD** : ajouter une étape `migrate --check` et bloquer si dérive (aurait attrapé #1).
2. **Tests d'intégration** sur les endpoints stats/congés (contrat front/back) — aurait attrapé #3, #4.
3. **Tests de permission** sur `ProtectedMediaView` (#5).
4. **Code-splitting** frontend (bundle 2,3 Mo en un chunk).
