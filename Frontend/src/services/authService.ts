import api from './api';
import type { User } from '@/types';

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

interface RegisterData {
  email: string;
  password1: string;
  password2: string;
  username: string;
  first_name?: string;
  last_name?: string;
}

export const authService = {
  // dj_rest_auth — POST /auth/login/
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login/', { email, password });
    return data;
  },

  // Google OAuth — POST /auth/google/ (allauth social)
  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/google/', { id_token: idToken });
    return data;
  },

  // dj_rest_auth registration — POST /auth/registration/
  register: async (userData: RegisterData): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/registration/', userData);
    return data;
  },

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
  logout: async (refreshToken: string) => {
    const { data } = await api.post('/auth/logout/', { refresh: refreshToken });
    return data;
  },

  // simplejwt — POST /auth/token/refresh/
  refreshToken: async (refresh: string) => {
    const { data } = await api.post('/auth/token/refresh/', { refresh });
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
