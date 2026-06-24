import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState, UserRole, USER_ROLES } from '@/types';
import { authService } from '@/services/authService';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<User>;
  loginWithGoogle: (accessToken: string) => Promise<User>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  updateUser: (userData: Partial<User>) => Promise<User>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUserRole = (role: string | undefined): UserRole | null => {
  if (!role) return null;
  const normalizedRole = role.toUpperCase();
  if (!USER_ROLES.includes(normalizedRole as UserRole)) return null;
  return normalizedRole as UserRole;
};

// Permissions par rôle
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  ADMIN: [
    'users.manage',
    'employees.view_all',
    'employees.create',
    'employees.edit',
    'employees.delete',
    'leaves.view_all',
    'leaves.approve',
    'churn.view',
    'recruitment.manage',
    'payroll.manage',
    'settings.manage',
    'analytics.view',
  ],
  RH: [
    'employees.view_all',
    'employees.create',
    'employees.edit',
    'leaves.view_all',
    'leaves.approve',
    'churn.view',
    'recruitment.manage',
    'payroll.view',
    'analytics.view',
  ],
  EMPLOYEE: [
    'employees.view_self',
    'leaves.request',
    'leaves.view_self',
    'tasks.view',
    'tasks.update',
    'documents.view_self',
    'documents.upload',
  ],
  CANDIDATE: [
    'jobs.view',
    'jobs.apply',
    'applications.view_self',
    'profile.edit',
  ],
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Verify stored token on startup
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');
    const refreshToken = localStorage.getItem('refresh_token');

    if (accessToken) {
      authService.getCurrentUser()
        .then((user) => {
          setState({
            user,
            accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
        })
        .catch((error: unknown) => {
          console.error('[AuthContext] Échec de la récupération du profil utilisateur :', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          setState(prev => ({ ...prev, isAuthenticated: false, user: null, accessToken: null, refreshToken: null, isLoading: false }));
        });
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const data = await authService.login(email, password);

      // Tokens sauvés avant getCurrentUser() car l'intercepteur axios les lit depuis localStorage
      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      let user: User;
      try {
        user = data.user ?? await authService.getCurrentUser();
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        throw new Error('Impossible de récupérer le profil utilisateur');
      }

      setState({
        user,
        accessToken: data.access,
        refreshToken: data.refresh,
        isAuthenticated: true,
        isLoading: false,
      });

      return user;
    } catch (error: unknown) {
      setState(prev => ({ ...prev, isLoading: false }));
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Email ou mot de passe incorrect'
          : 'Erreur de connexion au serveur';
      throw new Error(message);
    }
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const data = await authService.googleLogin(accessToken);

      localStorage.setItem('access_token', data.access);
      localStorage.setItem('refresh_token', data.refresh);

      setState({
        user: data.user,
        accessToken: data.access,
        refreshToken: data.refresh,
        isAuthenticated: true,
        isLoading: false,
      });

      return data.user;
    } catch (error: unknown) {
      setState(prev => ({ ...prev, isLoading: false }));
      const message =
        error && typeof error === 'object' && 'response' in error
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail || 'Connexion Google échouée'
          : 'Erreur de connexion au serveur';
      throw new Error(message);
    }
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
        // Ignore logout errors
      }
    }

    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    const normalizedRole = normalizeUserRole(state.user?.role);
    if (!normalizedRole) return false;
    return roles.includes(normalizedRole);
  }, [state.user]);

  const hasPermission = useCallback((permission: string) => {
    const normalizedRole = normalizeUserRole(state.user?.role);
    if (!normalizedRole) return false;
    const permissions = ROLE_PERMISSIONS[normalizedRole];
    return permissions.includes(permission);
  }, [state.user]);

  const updateUser = useCallback(async (userData: Partial<User>): Promise<User> => {
    const updatedUser = await authService.updateProfile(userData);
    setState((prev) => ({ ...prev, user: updatedUser }));
    return updatedUser;
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginWithGoogle, logout, hasRole, hasPermission, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
