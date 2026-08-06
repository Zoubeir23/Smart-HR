import api from './api';
import type { User } from '@/types';

/**
 * Réponse de connexion. Le refresh token est volontairement absent : il n'est
 * remis que dans un cookie HttpOnly, hors de portée du JavaScript.
 */
interface LoginResponse {
  access: string;
  user: User;
}

export const authService = {
  // dj_rest_auth — POST /auth/login/
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login/', { email, password });
    return data;
  },

  // SSO Google — POST /auth/google/ (credential = ID token signé par Google)
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/google/', { id_token: idToken });
    return data;
  },

  // NOTE : il n'existe volontairement pas d'inscription libre côté API.
  // Les candidats passent par POST /auth/register/candidate/ (avec OTP) et les
  // comptes internes sont créés par un administrateur.

  // dj_rest_auth — GET /auth/user/
  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get('/auth/user/');
    return data;
  },

  // dj_rest_auth — PUT /auth/user/
  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const { data } = await api.put('/auth/user/', userData);
    return data;
  },

  // dj_rest_auth — POST /auth/password/change/
  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/password/change/', {
      old_password: oldPassword,
      new_password1: newPassword,
      new_password2: newPassword,
    });
    return data;
  },

  // dj_rest_auth — POST /auth/logout/
  // Le refresh token à révoquer est lu par le backend dans le cookie HttpOnly.
  logout: async () => {
    const { data } = await api.post('/auth/logout/', {});
    return data;
  },

  // dj_rest_auth — POST /auth/password/reset/
  requestPasswordReset: async (email: string) => {
    const { data } = await api.post('/auth/password/reset/', { email });
    return data;
  },

  // dj_rest_auth — POST /auth/password/reset/confirm/
  confirmPasswordReset: async (
    uid: string,
    token: string,
    newPassword1: string,
    newPassword2: string,
  ) => {
    const { data } = await api.post('/auth/password/reset/confirm/', {
      uid,
      token,
      new_password1: newPassword1,
      new_password2: newPassword2,
    });
    return data;
  },

  // Smart-HR custom — GET /auth/admin/stats/
  getAdminStats: async () => {
    const { data } = await api.get('/auth/admin/stats/');
    return data;
  },

  // Admin — gestion des comptes utilisateurs
  listAllUsers: async () => {
    const { data } = await api.get('/auth/admin/users/');
    return data;
  },

  updateUserIsActive: async (userId: number, isActive: boolean) => {
    const { data } = await api.patch(`/auth/admin/users/${userId}/`, { is_active: isActive });
    return data;
  },

  updateUserRole: async (userId: number, role: string) => {
    const { data } = await api.patch(`/auth/admin/users/${userId}/`, { role });
    return data;
  },
};
