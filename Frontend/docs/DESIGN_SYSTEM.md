# Smart-HR Design System

**Version :** 1.0 — Refonte professionnelle SaaS RH
**Objectif :** Interface crédible pour mémoire de licence + publication scientifique

---

## 1. Palette de couleurs

### Mode Clair (Light)

| Token | HEX | Usage |
|-------|-----|-------|
| `--background` | `#F2F4F7` | Fond principal (gris très léger) |
| `--foreground` | `#1A202C` | Texte principal |
| `--card` | `#FFFFFF` | Cartes, surfaces surélevées |
| `--card-foreground` | `#1A202C` | Texte sur cartes |
| `--primary` | `#2563EB` | Actions, liens, accents (bleu pro) |
| `--primary-foreground` | `#FFFFFF` | Texte sur primary |
| `--muted` | `#F7F8FA` | Surfaces secondaires |
| `--muted-foreground` | `#6B7280` | Texte secondaire |
| `--border` | `#E5E7EB` | Bordures, séparateurs |
| `--destructive` | `#DC2626` | Erreurs, actions de suppression |
| `--success` | `#059669` | Validation, succès |
| `--warning` | `#D97706` | Alertes, avertissements |
| `--accent` | `#EDF2FF` | Survol, sélection (bleu clair) |

### Mode Sombre (Dark)

| Token | HEX | Usage |
|-------|-----|-------|
| `--background` | `#0F1419` | Fond principal (bleu nuit) |
| `--foreground` | `#F3F4F6` | Texte principal |
| `--card` | `#1A202C` | Cartes, surfaces |
| `--card-foreground` | `#F3F4F6` | Texte sur cartes |
| `--primary` | `#3B82F6` | Actions, accents |
| `--primary-foreground` | `#FFFFFF` | Texte sur primary |
| `--muted` | `#2D3748` | Surfaces secondaires |
| `--muted-foreground` | `#9CA3AF` | Texte secondaire |
| `--border` | `#374151` | Bordures |
| `--destructive` | `#EF4444` | Erreurs |
| `--success` | `#10B981` | Succès |
| `--warning` | `#F59E0B` | Alertes |
| `--accent` | `#1E3A5F` | Survol, sélection |

### Sidebar (spécifique)

| Token | Mode Clair | Mode Sombre |
|-------|------------|-------------|
| `--sidebar-background` | `#FFFFFF` | `#0F1419` |
| `--sidebar-foreground` | `#6B7280` | `#9CA3AF` |
| `--sidebar-accent` | `#F3F4F6` | `#2D3748` |
| `--sidebar-primary` | `#2563EB` | `#3B82F6` |

---

## 2. Typographie

- **Police principale :** `Plus Jakarta Sans` ou `Inter` (fallback)
- **Hiérarchie :**
  - H1 : 28px / 700 — Titres de page
  - H2 : 22px / 600 — Sections
  - H3 : 18px / 600 — Sous-sections
  - Body : 14px / 400 — Texte courant
  - Caption : 12px / 400 — Labels, métadonnées

---

## 3. Espacement & Grille

- **Base :** 4px
- **Grille :** 8px (2, 4, 6, 8, 12, 16, 24, 32)
- **Padding cartes :** 24px
- **Gap sections :** 24px

---

## 4. Composants UI

### Boutons
- **Primary :** fond `primary`, texte blanc
- **Secondary :** fond muted, bordure
- **Ghost :** transparent, survol accent
- **Destructive :** fond destructive pour actions de suppression

### Cards
- Border-radius : 8px
- Shadow : `0 1px 3px rgba(0,0,0,0.08)`
- Hover : border primary/30, shadow légère

### Tableaux
- Header : font-semibold, bg muted/50
- Lignes alternées optionnel
- Actions alignées à droite

### États
- **Loading :** Skeleton ou Spinner discret
- **Empty :** Illustration + message + CTA
- **Error :** Alert avec icône destructive + message

---

## 5. Icônes

- **Librairie :** Lucide React
- **Taille standard :** 20px (h-5 w-5)
- **Style :** Outline, cohérent, sobre
- **À éviter :** Icônes "IA gadget", néons, dégradés flashy

---

## 6. Animations

- **Durée sidebar :** 300ms ease-in-out
- **Transitions :** 150–200ms
- **Micro-interactions :** Hover scale 1.02 pour boutons

---

## 7. Accessibilité

- Contraste minimum WCAG AA
- Focus visible (ring primary)
- Labels sur tous les champs

---

## 8. Responsive Breakpoints

| Breakpoint | Min | Usage |
|------------|-----|-------|
| sm | 640px | Mobile large |
| md | 768px | Tablette |
| lg | 1024px | Desktop (sidebar persistante) |
| xl | 1280px | Large desktop |
