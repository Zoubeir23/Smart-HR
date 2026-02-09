import api from './api';
import type { User } from '@/types';

interface LoginResponse {
  access: string;
  refresh: string;
  user: User;
}

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: string;
}

export const authService = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/login/', { email, password });
    return data;
  },

  googleLogin: async (idToken: string): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/google/', { id_token: idToken });
    return data;
  },

  register: async (userData: RegisterData): Promise<LoginResponse> => {
    const { data } = await api.post('/auth/register/', userData);
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const { data } = await api.get('/auth/me/');
    return data;
  },

  updateProfile: async (userData: Partial<User>): Promise<User> => {
    const { data } = await api.put('/auth/me/update/', userData);
    return data;
  },

  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/me/change-password/', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return data;
  },

  logout: async (refreshToken: string) => {
    const { data } = await api.post('/auth/logout/', { refresh: refreshToken });
    return data;
  },

  refreshToken: async (refresh: string) => {
    const { data } = await api.post('/auth/token/refresh/', { refresh });
    return data;
  },

  getAdminStats: async () => {
    const { data } = await api.get('/auth/admin/stats/');
    return data;
  },
};
