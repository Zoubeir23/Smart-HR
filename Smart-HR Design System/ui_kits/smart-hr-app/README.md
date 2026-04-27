# Smart-HR · UI kit

Interactive, pixel-faithful recreation of the Smart-HR application UI.

## What's in this kit

A click-through demo of the core HR flow:

1. **Login page** — deep-indigo left branding panel + floating form card on the right, with four demo accounts (Admin · RH · Employé · Candidat).
2. **HR Dashboard** — faithful recreation of `Frontend/src/pages/dashboard/HRDashboard.tsx`:
   - KPI row (Total Employés · Congés en attente · Postes ouverts · Risque élevé)
   - Quick-action pills
   - Retention chart (SVG area)
   - Churn gauge + risk distribution
   - Employees-at-risk grid
   - Pending leaves — **approve / reject buttons really work** and emit toasts
   - Recent activity timeline
3. **Secondary pages** — stubbed "coming soon" views for Employés, Congés, Tâches, Paie, Documents, Formations, Offres, Analyse Churn, Chat IA, Assistant Vocal, Paramètres, Sécurité — so the sidebar click-through feels complete.

## How it's structured

```
ui_kits/smart-hr-app/
├── index.html         — entry; loads React 18 + Lucide + all JSX files
├── styles.css         — imports colors_and_type.css, adds component CSS
├── Icon.jsx           — <Icon name="users" /> wrapper around Lucide
├── Primitives.jsx     — Button · Badge · Card · Input · Pill · Eyebrow
├── Chrome.jsx         — Sidebar (8 nav groups) · Topbar (search + actions)
├── Dashboard.jsx      — KPICard · LeaveRow · EmployeeRiskCard · QuickAction
│                        RetentionChart · ChurnGauge · RiskDistribution · Timeline
├── Pages.jsx          — LoginPage · HRDashboardPage · StubPage
└── App.jsx            — shell: auth gate + nav state + toast queue
```

## Fidelity notes

- **Tokens** — every color, shadow, radius, and font is pulled from `colors_and_type.css`, which in turn mirrors `Frontend/src/index.css` exactly.
- **Copy** — every label, microcopy string, toast message is French and lifted from the source (`HRDashboard.tsx`, `LoginPage.tsx`, `Sidebar.tsx`).
- **Icons** — Lucide via CDN, same set used in production. Names match the `lucide-react` imports in the source.
- **Animations** — the real app uses Framer Motion. We approximate with CSS transitions (hover lift on cards, active-press scale, toast slide-in). Stagger / layout animations are intentionally omitted — not a kit concern.
- **Data** — mocked with Senegalese French names to fit the target market hinted at in the repo's localization. Accuracy of numbers is illustrative.

## What's intentionally simplified

- No real auth — the demo-account buttons prefill and submit.
- Stub pages for routes that aren't the dashboard.
- The retention chart is a hand-drawn SVG; the real app uses Recharts.
- The gauge is a simple SVG semicircle; real app uses a custom D3 gauge.
- No dark-mode toggle in the kit (tokens exist; wiring is trivial).

## How to riff on this

Want to mock a new Smart-HR screen? Reach for `Card`, `CardHead`, `CardBody`, `Button`, `Badge`, `Input`, `Eyebrow`, `Pill`, `KPICard` first — they cover most shapes. Use the sidebar's active-state pattern for any left-nav. Match headings at 28px/800/-0.02em and body copy at 13px/500 muted.
