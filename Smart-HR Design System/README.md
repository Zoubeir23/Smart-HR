# Smart-HR Design System

A design system for **Smart-HR** — a French-language, AI-augmented HRIS (SIRH) built for SMEs. The system combines a warm cream + deep red marketing palette with a dark-navy application sidebar, set in Plus Jakarta Sans.

---

## Sources

This system was extracted from the production codebase at `Zoubeir23/Smart-HR` on GitHub (`main` branch):

- **Token source** — `Frontend/src/index.css`, `Frontend/tailwind.config.ts`
- **Component source** — `Frontend/src/components/{layout,common,ui}/*`
- **Screen source** — `Frontend/src/pages/LandingPage.tsx`, `auth/LoginPage.tsx`, `dashboard/*`
- **Stack** — React 18 + TypeScript + Vite + Tailwind + shadcn/ui (Radix) + Framer Motion + Recharts + lucide-react
- **Language** — All UI copy is French (`<html lang="fr">`)

Nothing outside this repo is referenced; no Figma was provided.

---

## The product at a glance

Smart-HR ("SIRH Intelligent") is a role-based HR platform. Four roles each get a distinct dashboard:

| Role | Route | Purpose |
|---|---|---|
| `ADMIN` | `/dashboard` → AdminDashboard | System oversight, security |
| `RH` | `/dashboard` → HRDashboard | Core HR operations — the main surface |
| `EMPLOYEE` | `/dashboard` → EmployeeDashboard | Self-service (leaves, tasks, payslips) |
| `CANDIDATE` | `/dashboard` → CandidateDashboard | Job browsing + application tracking |

Functional pillars: **Employés · Congés · Tâches · Présences · Paie · Documents · Formations · Recrutement · IA (Analyse Churn, Chat IA, Assistant Vocal)**.

The AI story is prominent — turnover prediction (claimed 80% accuracy), CV analysis + candidate matching, an HR chatbot, and a voice assistant.

---

## Content fundamentals

**Language.** French, formal-leaning but warm. All labels, nav, copy, toasts are in French.

**Address.** Mostly **vous** / impersonal — "Accédez à votre espace de gestion RH", "Identifiez les collaborateurs à risque". Greetings are personalised: "Bonjour, {first_name}".

**Casing.** **Sentence case** everywhere — headings ("Risque de turnover", "Congés en attente"), buttons ("Demander une démo", "Voir la démo"). UPPERCASE is reserved exclusively for **eyebrows** and **micro-labels** (`text-[10px]`/`text-[11px]`, `tracking-widest`): "COLLABORATEURS ACTIFS", "ACCÈS DÉMO", "SLA 99.9% GARANTI".

**Tone.** Confident, product-y, lightly technical. Mixes HR warmth ("Fait avec passion pour l'humain") with tech credibility ("Machine Learning", "40+ signaux faibles", "SLA 99.9%", "< 200 ms"). Proof-points lean on numbers: "-25% de turnover", "-40% de temps admin", "1 500+ PME".

**Vocabulary.** French HR terms used rigorously — *collaborateur* (not employé in marketing), *GRH*, *SIRH*, *turnover*, *onboarding*, *RGPD*. Role labels: Administrateur · Responsable RH · Employé · Candidat.

**Emoji.** **Used sparingly, contextually**, never decoratively:
- Leave types in HR dashboard: 🏖️ vacances, 🤒 maladie, 👤 personnel, 👶 maternité, 📋 autre
- Landing hero has zero emoji — tone there is serious/corporate

**Icons > emoji.** Lucide icons do almost all the work (`Users`, `Calendar`, `Sparkles`, `BarChart3`, `TrendingDown`, `UserSearch`, `Bot`).

**Examples to copy from.**
- Hero H1: *"Le futur des RH et de la gestion des tâches pour les PME"*
- Eyebrow: *"INTELLIGENCE ARTIFICIELLE RH"*
- Feature card: *"Prédiction de l'Attrition / Identifiez les collaborateurs à risque avant qu'ils ne partent. Notre IA analyse 40+ signaux faibles pour réduire votre turnover de 25%."*
- CTA: *"Demander une démo"* · *"Essayer Gratuitement"* · *"En savoir plus"* · *"Voir en action"*
- Notification: *"Risque de turnover détecté · Alerte IA : Fatou Ndiaye présente un risque élevé · Il y a 2h"*
- Toast: *"Congé approuvé · La demande de congé a été approuvée avec succès."*

---

## Visual foundations

### Two distinct surfaces
Smart-HR runs on **two coexisting palettes** you must not mix:

1. **App surface (light by default):** warm cream background `#FFF3E0`, white cards, red-as-action. All dashboards + forms.
2. **Sidebar + Login hero:** always-dark navy gradient (`#08111e → #0a1628 → #07101c`). Even in light mode. The login page also uses a deep-indigo left panel (`hsl(226 70% 18%) → hsl(234 62% 38%)`).

Dark mode of the app surface is a warm dark (`hsl(20 12% 7%)`) — never pure black.

### Colors
- **Primary = cream (`#FFF3E0`)** — rarely used as a fill; it *is* the page. Primary buttons in the app use cream as background with dark-red text. In marketing, `text-primary` is red.
- **Secondary = deep red `#D62828`** — the action color. CTAs, active nav, focus rings, destructive actions, chart highlights.
- **Success** = teal-green `hsl(160 84% 28%)`. **Warning** = orange `hsl(25 95% 53%)`. **Destructive** = same as secondary red.
- Role-coded avatar gradients (sidebar): Admin rose→pink, RH indigo→blue, Employee emerald→teal, Candidate amber→orange.

### Type
Plus Jakarta Sans, weights 400/500/600/700/**800**. Inter is the fallback. Headlines go hard — `font-extrabold` (800) with `tracking-tight` / `-tighter`. Body is 500 (`font-medium`), not 400 — gives the UI a confident, slightly heavy rhythm. Eyebrows are `text-[10px]` or `text-[11px]`, bold, UPPERCASE, `tracking-widest`.

### Spacing & layout
8-pt grid via Tailwind defaults. `max-w-7xl` container on marketing (`px-6`, centered). Generous marketing rhythm: `py-24` sections, `gap-8`–`gap-16` grids. Dashboards are denser — `space-y-6`, `gap-4`–`gap-6`. Sidebar width: 272px expanded, 72px collapsed.

### Radii
- `0.5rem` (8) = base `--radius` → inputs, buttons, small cards
- `0.75rem` (12) = `rounded-xl` → KPI cards, secondary panels
- `1rem` (16) = `rounded-2xl` → CTA buttons on landing, feature tiles
- `1.5rem` (24) = `rounded-3xl` → hero mockups, big marketing cards
- `rounded-full` → pills, avatars, badges

### Shadows
Warm-tinted (`rgb(80 30 10 / x)`), never neutral gray. Four steps: `sm` / `md` / `lg` + a red **`--shadow-glow`** for focus/hero emphasis (`0 0 20px -6px hsl(0 68% 50% / 0.20)`). Sidebar uses a dedicated red glow `0 0 16px rgba(214,40,40,0.45)` on the logo mark.

### Backgrounds
- App: flat cream, occasionally a `mesh-gradient` utility (subtle radial tints) on hero sections.
- Sidebar: vertical 3-stop navy gradient + a 3% opacity dot-grid SVG overlay + a blurred indigo glow orb in the top-right corner.
- Login hero: indigo gradient + 4% opacity grid lines + 3% 45° diagonal stripes + animated floating dots + two large radial glows.
- **No full-bleed photography.** No hand-drawn illustrations. Mockups-inside-cards are the product's visual storytelling device.

### Animation
Framer Motion throughout. House easing: **`[0.25, 0.46, 0.45, 0.94]`** (custom ease-out) or `[0.4, 0, 0.2, 1]` (Material standard). Durations: 180–280 ms for UI, 400–700 ms for page entries. Stagger children by **80 ms** (`staggerChildren: 0.08`). Custom keyframes: `fadeIn`, `slideUp`, `scaleIn`, `shimmer` (loading), `float` (3s loop), `pulse`, `micPulse` (voice assistant).

### States
- **Hover** — cards: `shadow-sm → shadow-md` + border goes to `red/30`. Nav items: white/6% background + color lift. Buttons: `brightness-110`.
- **Active/press** — `active:scale-[0.98]` or `whileTap: scale: 0.98`. Active nav has a 3-px red left accent with red glow.
- **Focus** — red ring via `focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.08)]` or `--ring`.
- **Disabled** — reduced opacity, no background change.

### Borders, glass, transparency
Borders are warm gray `hsl(34 30% 86%)`, 1px. Glass surfaces (`glass-card`) use `rgba(255,255,255,0.80)` + 16 px backdrop blur — used on the landing nav and hero mockup shell. On dark navy, everything uses `rgba(255,255,255,0.04–0.08)` layers with matching borders at `0.06–0.10`.

### Cards
Default recipe: `bg-card` (white) + `border-border` + `rounded-xl` (12) + `shadow-sm` + `p-6`. On hover: `shadow-md` + `border-secondary/30`. The **`.kpi-card`** recipe adds a 3-px red gradient bar across the top. Marketing feature cards use `rounded-3xl` (24) with `bg-slate-50` that lifts to `bg-white + shadow-lg` on hover.

### Protection / emphasis
No protection gradients. Emphasis comes from **red glow** (`--shadow-glow`) and **gradient text** on hero words. Pill capsules (`rounded-full`, cream/red/10% tint) flag eyebrows and statuses.

---

## Iconography

**Icon system: `lucide-react` v0.462.0.** Used everywhere via `<Icon className="w-4 h-4 text-..." />`. Default stroke, no custom weight. Standard sizes: 14 px (inline), 16 px (form/nav), 20 px (buttons), 24 px (feature tiles), 32 px (hero feature cards).

The CDN equivalent for this design system is `lucide@latest` from unpkg or the stylesheet-free SVG set — use it; do **not** hand-draw replacements.

**Actual logo.** Abstract "team" mark — three rounded rectangles (silhouettes) with a horizontal tie bar, on a primary-color rounded square (`rx=10`). Lives in `components/common/Logo.tsx` and `public/favicon.svg`. Three variants: `full` (icon + wordmark), `icon`, `text`. Wordmark is **Smart** (fg) + **-HR** (primary/red).

**Sidebar logo mark.** Replaced at runtime by a `Sparkles` icon on a red-gradient rounded square with a red glow — this is the app's in-product "Smart-HR" mark.

**SVG, not PNG.** No raster icons. The favicon is a 48×48 SVG. We've copied `assets/favicon.svg` and `assets/logo.svg` (the full team mark).

**Emoji.** Only for leave types (🏖️🤒👤👶📋). Never in marketing, never as decoration.

**Unicode glyphs.** `&bull;` used as password placeholder dots. `&mdash;` separates compound labels ("10 juin — 15 juin").

---

## Index (what's in this folder)

```
/  (root)
├── README.md                 — this file
├── SKILL.md                  — agent skill manifest (drop-in for Claude Code)
├── colors_and_type.css       — all CSS vars: palette, type scale, radii, shadows, gradients
├── assets/
│   ├── logo.svg              — full Smart-HR team mark (wordmark-less, color-configurable)
│   └── favicon.svg           — 48×48 app favicon
├── fonts/                    — (Google Fonts CDN; no local TTFs bundled — see note below)
├── preview/                  — design-system cards (registered in the Design System tab)
│   ├── type-*.html           — typography specimens
│   ├── color-*.html          — palettes + semantic swatches
│   ├── spacing-*.html        — radii, shadows, spacing scale
│   ├── component-*.html      — buttons, inputs, cards, badges, nav, kpi
│   └── brand-*.html          — logo, favicon, sidebar mark
├── ui_kits/
│   └── smart-hr-app/         — UI kit: live interactive recreation of the product
│       ├── README.md
│       ├── index.html        — login → dashboard click-through
│       ├── styles.css
│       └── components.jsx    — Sidebar, Topbar, KPICard, LeaveRow, etc.
└── Frontend/                 — imported reference source (read-only; kept for traceability)
```

### Font files — flagged

The codebase pulls **Plus Jakarta Sans** and **Inter** from Google Fonts via `@import url(...)` in `index.css`. No local `.ttf`/`.woff2` is shipped. This design system follows the same approach and uses the CDN. **If you need offline fonts, please attach the files to `fonts/`** and I'll rewire `@font-face`.

### Icon files — flagged

Lucide is the production icon library and is not bundled here — it's consumed as a React package. In standalone HTML artifacts we load Lucide from CDN (`https://unpkg.com/lucide@latest`). No substitution occurred; this matches the source.
