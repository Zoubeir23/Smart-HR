# Smart-HR — Routes et Navigation

## Routes publiques
| Path | Page | Accès |
|------|------|-------|
| `/login` | LoginPage | Tous |
| `/register` | RegisterPage | Tous |
| `/unauthorized` | UnauthorizedPage | Tous |

## Routes protégées (authentifiées)

### Dashboards (selon rôle)
| Path | Page | Rôles |
|------|------|-------|
| `/dashboard` | AdminDashboard | ADMIN |
| `/dashboard` | HRDashboard | RH |
| `/dashboard` | EmployeeDashboard | EMPLOYEE |
| `/dashboard` | CandidateDashboard | CANDIDATE |

### Gestion RH
| Path | Page | Rôles |
|------|------|-------|
| `/employees` | EmployeeListPage | ADMIN, RH |
| `/employees/:id` | EmployeeDetailPage | ADMIN, RH |
| `/leaves` | LeaveListPage | ADMIN, RH, EMPLOYEE |
| `/tasks` | TaskBoardPage | ADMIN, RH, EMPLOYEE |
| `/attendance` | AttendancePage | ADMIN, RH |
| `/payroll` | PayrollPage | ADMIN, RH |

### Documents & Formation
| Path | Page | Rôles |
|------|------|-------|
| `/documents` | DocumentsPage | ADMIN, RH, EMPLOYEE |
| `/training` | TrainingPage | ADMIN, RH, EMPLOYEE |

### Recrutement
| Path | Page | Rôles |
|------|------|-------|
| `/jobs` | JobOfferListPage | Tous (authentifiés) |
| `/jobs/:jobId/apply` | ApplyPage | CANDIDATE |
| `/my-applications` | ApplicationTrackingPage | CANDIDATE |

### Analytics & IA
| Path | Page | Rôles |
|------|------|-------|
| `/ai-insights` | ChurnDashboardPage | ADMIN, RH |
| `/ai-chat` | AIChatPage | ADMIN, RH |
| `/voice-assistant` | VoiceAssistantPage | ADMIN, RH |

### Paramètres & Profil
| Path | Page | Rôles |
|------|------|-------|
| `/settings` | SettingsPage | Tous |
| `/profile` | ProfilePage | Tous |
| `/security` | SecurityPage | ADMIN |

## Sidebar — Structure des modules
- Principal : Tableau de bord
- Gestion RH : Employés, Congés, Tâches, Présences, Paie
- Documents & Formation
- Recrutement
- Analytics & IA (Analyse Churn, Chat IA, Assistant Vocal)
- Configuration : Paramètres, Sécurité (Admin uniquement)
