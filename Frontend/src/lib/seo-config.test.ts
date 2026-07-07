import { describe, expect, it } from 'vitest';
import { DEFAULT_SEO, getSEOForPath } from './seo-config';

// Routes statiques protégées de App.tsx — tenues à jour manuellement pour
// détecter toute nouvelle page oubliée dans SEO_PAGES (bug déjà rencontré :
// /services, /positions, /reference-tables, /contracts, /discipline,
// /communication, /performance et /analytics n'avaient pas de titre dédié
// et retombaient silencieusement sur le titre générique par défaut).
const PROTECTED_STATIC_ROUTES = [
  '/dashboard',
  '/employees',
  '/employees/create',
  '/departments',
  '/services',
  '/positions',
  '/reference-tables',
  '/contracts',
  '/leaves',
  '/tasks',
  '/attendance',
  '/payroll',
  '/discipline',
  '/communication',
  '/performance',
  '/documents',
  '/training',
  '/calendar',
  '/jobs',
  '/my-applications',
  '/applications',
  '/analytics',
  '/ai-insights',
  '/ai-chat',
  '/recruteur-ia',
  '/voice-assistant',
  '/settings',
  '/profile',
  '/security',
  '/admin/users',
];

describe('getSEOForPath', () => {
  it.each(PROTECTED_STATIC_ROUTES)('a un titre dédié pour %s (pas le titre générique par défaut)', (path) => {
    const seo = getSEOForPath(path);
    expect(seo.title).not.toBe(DEFAULT_SEO.title);
  });

  it('retombe sur le titre par défaut pour une route inconnue', () => {
    const seo = getSEOForPath('/route-qui-nexiste-pas');
    expect(seo.title).toBe(DEFAULT_SEO.title);
  });
});
