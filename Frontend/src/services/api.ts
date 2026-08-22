import axios from 'axios';

export function normalizeApiUrl(rawApiUrl: string): string {
  const trimmedApiUrl = rawApiUrl.trim().replace(/\/+$/, '');

  if (!trimmedApiUrl) {
    return '/api/v1';
  }

  if (trimmedApiUrl.endsWith('/api')) {
    return `${trimmedApiUrl}/v1`;
  }

  return trimmedApiUrl;
}

// Si VITE_API_URL est vide (secret CI non défini, ou volontairement omis en
// production où nginx reverse-proxifie /api/ vers Django), on retombe sur un
// chemin RELATIF (/api/v1) plutôt que sur un hôte fixe : nginx.vps.conf et le
// proxy Vite en dev (vite.config.ts) savent tous deux router /api/ vers le
// backend. Un fallback absolu (ex: localhost:8000) casserait l'app pour tout
// visiteur réel, dont le navigateur tenterait de joindre SON PROPRE localhost.
const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL || '');

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
  // Le refresh token vit dans un cookie HttpOnly posé par le backend : il doit
  // accompagner les requêtes pour que /auth/token/refresh/ et /auth/logout/
  // puissent le lire. Il n'est jamais accessible au JavaScript.
  withCredentials: true,
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Le Content-Type par défaut de l'instance est 'application/json'. Pour un
  // corps FormData (upload de CV, documents, import Excel...), ce header
  // forcé fait sérialiser le FormData en JSON par axios (transformRequest le
  // convertit via JSON.stringify) au lieu de l'envoyer en multipart/form-data
  // — le fichier et les champs sont alors perdus et le backend répond 400.
  // On retire le header pour laisser le navigateur poser lui-même
  // 'multipart/form-data; boundary=...'.
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

// Mutex de rafraîchissement : le backend a ROTATE_REFRESH_TOKENS +
// BLACKLIST_AFTER_ROTATION, donc si plusieurs requêtes 401 se déclenchent en
// parallèle (ex. chargement d'un dashboard), seul le premier refresh doit
// partir sur le réseau — les autres attendent son résultat au lieu de
// blacklister un refresh token déjà consommé et déconnecter l'utilisateur.
let refreshPromise: Promise<string> | null = null;

/**
 * Renouvelle l'access token à partir du cookie HttpOnly de refresh.
 *
 * Le corps de la requête est vide : le backend lit le refresh token dans le
 * cookie, le fait tourner et repose le nouveau cookie lui-même. Tant que ce
 * jeton était géré côté JavaScript, la rotation le rendait obsolète en
 * localStorage et la session sautait au deuxième rafraîchissement.
 */
export function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access: string }>(
        `${API_URL}/auth/token/refresh/`,
        {},
        { withCredentials: true },
      )
      .then(({ data }) => {
        localStorage.setItem('access_token', data.access);
        return data.access;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

/**
 * Renvoie vers la page de connexion en conservant la destination demandée,
 * pour y ramener l'utilisateur une fois reconnecté.
 */
export function redirectToLogin(): void {
  localStorage.removeItem('access_token');

  const currentPath = `${window.location.pathname}${window.location.search}`;
  const isAlreadyOnLogin = window.location.pathname === '/login';
  window.location.assign(
    isAlreadyOnLogin ? '/login' : `/login?next=${encodeURIComponent(currentPath)}`,
  );
}

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isRefreshRequest = originalRequest?.url?.includes('/auth/token/refresh/');

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshRequest) {
      originalRequest._retry = true;

      try {
        const accessToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        // Cookie de refresh absent ou expiré : la session est terminée.
        redirectToLogin();
      }
    }

    return Promise.reject(error);
  }
);

export default api;
