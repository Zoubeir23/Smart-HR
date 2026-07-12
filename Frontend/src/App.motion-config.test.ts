import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

// PRODUCT.md exige explicitement le respect de `prefers-reduced-motion`.
// Framer Motion n'expose ce comportement qu'au runtime (lecture de
// `window.matchMedia`) ; un test de rendu complet de l'App (routing,
// auth, query client) serait disproportionné pour vérifier un simple
// câblage de provider. On vérifie donc que le point d'entrée déclare
// bien `MotionConfig reducedMotion="user"` autour de l'arbre applicatif —
// le contrat de propagation runtime est garanti par Framer Motion lui-même.
const appSource = readFileSync(path.resolve(__dirname, './App.tsx'), 'utf-8');

describe("App — respect de prefers-reduced-motion câblé globalement", () => {
  it('importe MotionConfig depuis framer-motion', () => {
    expect(appSource).toMatch(/import\s*{\s*MotionConfig\s*}\s*from\s*["']framer-motion["']/);
  });

  it('enveloppe l\'arbre applicatif avec MotionConfig reducedMotion="user"', () => {
    expect(appSource).toMatch(/<MotionConfig\s+reducedMotion="user">/);
    // La balise doit bien être fermée quelque part dans le fichier (pas oubliée).
    expect(appSource).toMatch(/<\/MotionConfig>/);
  });
});
