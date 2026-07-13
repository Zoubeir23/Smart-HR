---
name: Smart-HR
description: SIRH intelligent pour PME — la GRH augmentée par l'IA
colors:
  brand-red: "#D62828"
  brand-red-dark: "#c41e1e"
  brand-red-light: "#e86060"
  brand-cream: "#FFF3E0"
  brand-navy: "#08111e"
  brand-navy-800: "#0a1628"
  ink: "#1c1410"
  muted-ink: "#816e65"
  card-white: "#ffffff"
  warm-border: "#e5dccc"
  muted-cream: "#efe6d8"
  success-green: "#0b7a52"
  warning-orange: "#f97316"
typography:
  headline:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.5
  label:
    fontFamily: "Plus Jakarta Sans, Inter, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.3
  code:
    fontFamily: "'Courier New', Courier, monospace"
    fontSize: "0.875rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "6px"
  md: "10px"
  lg: "12px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
components:
  button-primary:
    backgroundColor: "{colors.brand-red}"
    textColor: "#ffffff"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.brand-red-dark}"
  button-secondary:
    backgroundColor: "{colors.brand-cream}"
    textColor: "{colors.brand-red-dark}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "40px"
  input-default:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "44px"
  card-default:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Smart-HR

## 1. Overview

**Creative North Star: "La Braise sous contrôle"**

Le rouge braise #D62828 est une énergie maîtrisée : il ne brûle que là où l'utilisateur agit — CTA, navigation active, focus, alertes churn. Partout ailleurs, la surface reste calme : crème Sahel en fond de travail, cartes blanches strictes, encres chaudes. La sensation premium vient de la précision (états complets, transitions 150-250 ms, espacements réguliers), jamais de la décoration. C'est un poste de pilotage RH : l'outil s'efface derrière la tâche, et l'intensité visuelle est proportionnelle à l'importance de l'action.

Ce système rejette explicitement le « logiciel de paie des années 2000 » (tableaux gris denses sans hiérarchie) et le SaaS générique interchangeable (dégradés violets, grilles de cards identiques). Même en mode sombre, la chaleur demeure : fond brun-noir chaud (hsl 20 12% 7%), jamais de noir bleuté froid. La sidebar navy nuit est la seule surface toujours sombre — le cadre stable autour du travail.

**Key Characteristics:**
- Un seul accent : le rouge braise, dosé — jamais plus de ~10 % d'une vue en usage courant
- Surfaces chaudes en toute circonstance (cream en clair, brun-noir en sombre, ombres teintées 80/30/10)
- Typographie mono-famille (Plus Jakarta Sans) : graisse 500 pour le corps, 700-800 pour les titres
- Composants aux deux registres : précis dans les flux de gestion, généreux sur les moments de décision (CTA, IA)
- Dark mode complet et chaleureux ; la sidebar reste navy dans les deux thèmes

## 2. Colors

Une palette chaude à accent unique : le rouge agit, le crème porte, le navy encadre.

### Primary
- **Rouge Braise** (#D62828): l'action et rien d'autre — boutons primaires, item de navigation actif, focus ring, jauges de risque churn élevé. Décliné en **Rouge Braise Sombre** (#c41e1e) au hover et **Rouge Braise Clair** (#e86060) pour les états atténués. Sert aussi de couleur destructive : la suppression est une action forte, même langage.

### Neutral
- **Crème Sahel** (#FFF3E0): le fond de travail en mode clair — chaud, jamais blanc clinique. Décliné en muted/secondary (#efe6d8) pour chips et surfaces subtiles.
- **Blanc Carte** (#ffffff): les cartes et champs sont strictement blancs sur le fond crème — le contraste de surface fait la hiérarchie.
- **Encre** (#1c1410): texte principal, un brun-noir chaud, pas un noir pur.
- **Encre Atténuée** (#816e65): texte secondaire, libellés, mentions — le `--muted-foreground` de l'app. Contraste 4.83:1 sur blanc (AA). Ne jamais l'utiliser sur crème (#efe6d8), où il tombe à 3.9:1 : sur fond crème, la hiérarchie passe par la graisse, pas par la couleur.
- **Bordure Chaude** (#e5dccc / hsl 34 30% 86%): bordures et séparateurs, toujours teintés chauds.
- **Navy Nuit** (#08111e → #0a1628): la sidebar, sombre dans les deux thèmes, avec l'item actif en dégradé rouge braise.

### Semantic
- **Vert Validation** (hsl 160 84% 28%): congés approuvés, statuts sains, tendances positives.
- **Orange Vigilance** (hsl 25 95% 53%): états d'attente, risque churn moyen.

### Named Rules
**La Règle de la Braise.** Le rouge est réservé à l'action et au signal. Un écran où le rouge dépasse ~10 % de la surface (hors moments de décision assumés) est un écran qui crie.
**La Règle de la Chaleur.** Aucun gris neutre nulle part : chaque neutre, ombre ou bordure est teinté chaud (hue 20-37). Un gris bleuté est un corps étranger.

## 3. Typography

**Display/Body Font:** Plus Jakarta Sans (avec Inter puis system-ui en fallback)

**Character:** Une seule famille, géométrique et contemporaine, qui fait tout : la hiérarchie vient des graisses (500 → 800) et non d'un changement de voix. Corps en 500 — plus affirmé que le 400 standard, c'est une signature du système.

### Hierarchy
- **Headline** (800, 1.5rem, tracking -0.025em): titres de page. `tracking-tighter` est la marque des h1.
- **Title** (700, 1.125rem, tracking -0.015em): titres de cartes et de sections.
- **Body** (500, 0.875rem, lh 1.5): texte courant, cellules de tableau. Prose longue plafonnée à 65-75ch.
- **Label** (600, 0.75rem): libellés de formulaire, en-têtes de colonnes, badges.
- **Code** (Courier New, 700, tracking 0.08em): la seule exception à la mono-famille — réservée aux chaînes que l'utilisateur doit recopier caractère par caractère (code OTP, mot de passe temporaire). La chasse fixe y est fonctionnelle : elle distingue 0/O et 1/l. Jamais décorative.

### Named Rules
**La Règle de la Graisse.** La hiérarchie s'exprime par le poids (500/600/700/800), jamais par une deuxième famille dans l'UI produit. DM Serif Display n'existe que sur les surfaces vitrines (landing), jamais dans l'app.

## 4. Elevation

Plat au repos, ombre en réponse. Les surfaces sont plates par défaut (cartes en `shadow-sm` à peine perceptible) ; la profondeur n'apparaît qu'en réponse à un état : hover de carte interactive, menus, modales, toasts. Toutes les ombres du mode clair sont teintées chaudes (rgb 80 30 10), jamais grises — même l'ombre appartient à la palette.

### Shadow Vocabulary
- **Repos** (`0 1px 2px 0 rgb(80 30 10 / 0.06)`): cartes au repos.
- **Réponse** (`0 4px 8px -1px rgb(80 30 10 / 0.10), 0 2px 4px -2px rgb(80 30 10 / 0.06)`): hover, éléments soulevés.
- **Flottant** (`0 10px 20px -3px rgb(80 30 10 / 0.12), ...`): popovers, dropdowns, modales.
- **Braise** (`0 0 20px -6px hsl(0 68% 50% / 0.22)`): halo rouge, réservé aux moments de décision (CTA majeurs, éléments IA actifs).

### Named Rules
**La Règle du Plat.** Une surface au repos ne projette pas d'ombre visible. Si un écran statique montre des ombres marquées partout, il est faux.

## 5. Components

Deux registres assumés : précis et réactifs dans les flux de gestion (tableaux, formulaires — réponse nette, `active:scale-[0.98]`, transitions 150-200 ms) ; généreux et tactiles sur les moments de décision (CTA d'onboarding, actions IA — tailles lg, halo braise autorisé).

### Buttons
- **Shape:** coins nettement arrondis (10px par défaut, 8px en sm, 12px en lg)
- **Primary:** dégradé rouge braise 135° (#D62828 → #e63c3c), texte blanc, `shadow-sm` ; hauteur 40px, padding 8px 16px
- **Hover / Focus:** `brightness 1.08` + montée en `shadow-md` au hover ; focus ring rouge 2px avec offset ; press en `scale(0.98)`
- **Secondary:** fond crème Sahel, texte rouge sombre, bordure chaude — le bouton « calme »
- **Outline / Ghost:** bordure chaude sur fond carte / transparent ; le ghost est l'action contextuelle discrète
- **Destructive:** rouge plein #D62828 → #c41e1e au hover (même langage que le primaire : agir fort)

### Cards / Containers
- **Corner Style:** 12px (`rounded-xl`)
- **Background:** blanc strict sur fond crème (clair) ; hsl 20 10% 11% (sombre)
- **Shadow Strategy:** repos en `shadow-sm`, réponse au hover uniquement (cf. Elevation)
- **Border:** 1px bordure chaude ; au hover des cartes interactives, la bordure vire au rouge/30
- **Internal Padding:** 24px (en-têtes et contenus), 16px en compact

### Inputs / Fields
- **Style:** fond blanc carte, bordure chaude 1px, radius 10px, hauteur 44px (cible tactile AA), texte 500
- **Focus:** bordure rouge braise + halo doux `0 0 0 3px hsl(0 69% 50% / 0.08)` — jamais d'outline navigateur brut
- **Error / Disabled:** disabled en fond muted crème, opacité pleine (lisibilité conservée)

### Navigation
- **Sidebar navy nuit** (280px étendue, 72px repliée), toujours sombre. Item actif : dégradé rouge braise + texte blanc + ombre portée rouge ; hover : surface accent subtile. Groupes titrés en label 9.5px uppercase tracked. Sur mobile : overlay avec backdrop flouté, fermeture au tap extérieur.

### Jauge de risque churn (composant signature)
La matérialisation de la promesse IA : score 0-100 % coloré par palier (vert validation < 40, orange vigilance 40-69, rouge braise ≥ 70), animée à l'entrée, avec la raison principale explicable à côté du score. C'est l'un des rares endroits où le rouge a le droit d'occuper l'espace.

## 6. Do's and Don'ts

### Do:
- **Do** réserver le rouge braise à l'action et au signal (La Règle de la Braise) ; le reste de l'écran travaille en crème, blanc et encre.
- **Do** teinter chaud tout neutre, ombre ou bordure (hue 20-37) — y compris en mode sombre (fond hsl 20 12% 7%).
- **Do** livrer chaque composant interactif avec ses états complets : default, hover, focus-visible, active, disabled, loading, error.
- **Do** garder les cibles tactiles ≥ 44px (les inputs h-11 sont la référence) et les contrastes AA ≥ 4.5:1.
- **Do** respecter `prefers-reduced-motion` sur toute animation ; les transitions restent en 150-250 ms, easing ease-out.
- **Do** penser aux connexions lentes : skeletons plutôt que spinners centraux, bundles légers, états vides qui enseignent l'interface.

### Don't:
- **Don't** reproduire le « logiciel de paie des années 2000 » : tableaux gris denses sans hiérarchie, formulaires interminables sans respiration (anti-référence de PRODUCT.md).
- **Don't** introduire le SaaS générique interchangeable : dégradés violets, grilles de cards identiques icône+titre+texte, glassmorphisme décoratif.
- **Don't** utiliser de gris neutre ou bleuté — chaque neutre appartient à la gamme chaude.
- **Don't** utiliser de texte en dégradé (`background-clip: text`) dans l'UI produit ; ce traitement est cantonné aux héros des surfaces vitrines existantes et ne s'étend pas.
- **Don't** poser de bordure latérale colorée > 1px (side-stripe) sur cartes, alertes ou listes ; la hiérarchie passe par le fond teinté ou la bordure complète.
- **Don't** faire porter la hiérarchie par une deuxième famille de caractères dans l'app : une famille, quatre graisses.
- **Don't** animer en bounce/elastic ni orchestrer des séquences d'entrée de page ; le mouvement signale un état, il ne décore pas.
