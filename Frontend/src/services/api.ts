import axios from 'axios';

function normalizeApiUrl(rawApiUrl: string): string {
  const trimmedApiUrl = rawApiUrl.trim().replace(/\/+$/, '');

  if (!trimmedApiUrl) {
    return '/api/v1';
  }

  if (trimmedApiUrl.endsWith('/api')) {
    return `${trimmedApiUrl}/v1`;
  }

  return trimmedApiUrl;
}

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1');

const api = axios.create({
  baseURL: API_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Mutex de rafraîchissement : le backend a ROTATE_REFRESH_TOKENS +
// BLACKLIST_AFTER_ROTATION, donc si plusieurs requêtes 401 se déclenchent en
// parallèle (ex. chargement d'un dashboard), seul le premier refresh doit
// partir sur le réseau — les autres attendent son résultat au lieu de
// blacklister un refresh token déjà consommé et déconnecter l'utilisateur.
let refreshPromise: Promise<string> | null = null;

export function refreshAccessToken(refreshToken: string): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<{ access: string }>(`${API_URL}/auth/token/refresh/`, {
        refresh: refreshToken,
      })
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

// Response interceptor: auto-refresh on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken) {
        try {
          const accessToken = await refreshAccessToken(refreshToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        } catch {
          // Refresh failed, clear tokens and redirect to login
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          window.location.href = '/login';
        }
      } else {
        localStorage.removeItem('access_token');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
