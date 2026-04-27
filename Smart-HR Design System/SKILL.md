---
name: smart-hr-design
description: Use this skill to generate well-branded interfaces and assets for Smart-HR, either for production or throwaway prototypes/mocks/etc. Contains essential design guidelines, colors, type, fonts, assets, and UI kit components for prototyping.
user-invocable: true
---

Read the README.md file within this skill, and explore the other available files.

If creating visual artifacts (slides, mocks, throwaway prototypes, etc), copy assets out and create static HTML files for the user to view. If working on production code, you can copy assets and read the rules here to become an expert in designing with this brand.

If the user invokes this skill without any other guidance, ask them what they want to build or design, ask some questions, and act as an expert designer who outputs HTML artifacts _or_ production code, depending on the need.

## Fast start

- **Language** — Smart-HR is French-first. All UI copy stays in French. Use **vous** and sentence case. UPPERCASE is reserved for 10–11px tracked-wide eyebrows only.
- **Palette** — cream `#FFF3E0` page, white cards, deep red `#D62828` as the action color, dark-navy sidebar (`#08111e` → `#0a1628` → `#07101c`) that is *always dark*.
- **Type** — Plus Jakarta Sans, 500 body, 700–800 headings with `-0.02em` tracking on display sizes.
- **Icons** — `lucide-react` (or `lucide` CDN in HTML). No emoji except leave types: 🏖️🤒👤👶📋.
- **Radii** — 8 / 12 / 16 / 24, plus `999px` pills.
- **Shadows** — warm-tinted (`rgb(80 30 10 / x)`), never neutral gray. Red `--shadow-glow` for emphasis.

## Where to look

- `README.md` — full brand, content, and visual foundations (this is the canonical reference).
- `colors_and_type.css` — every token: palette, gradients, radii, shadows, spacing, type scale. Import it.
- `ui_kits/smart-hr-app/` — interactive UI kit. Copy components from `Primitives.jsx`, `Chrome.jsx`, `Dashboard.jsx`, `Pages.jsx` as starting points.
- `assets/` — SVG logos (`logo-icon.svg`, `logo-lockup.svg`). Favicon uses `logo-icon.svg`.
- `preview/` — static design-system cards (type, color, spacing, components, brand).
- `Frontend/` — the original imported source (read-only reference, traceability).

## House patterns

- KPI card: white card + 3px red gradient top bar + tinted icon tile (indigo/amber/emerald/rose by role).
- Sidebar active state: red left accent (3px, glowing) + red-tinted background (`rgba(214,40,40,0.18)`).
- Buttons: primary = red gradient; outline = white + warm border; ghost for tertiary.
- Toasts: 12px radius + left color accent (green for success, red for destructive).
- House easing: `[0.25, 0.46, 0.45, 0.94]` for page entries; 80ms stagger between children.
