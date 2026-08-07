import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState, UserRole, USER_ROLES } from '@/types';
import { authService } from '@/services/authService';
import { getAuthErrorMessage } from '@/lib/authErrors';

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

  // Le bouton "Précédent" du navigateur peut restaurer une page protégée
  // depuis le bfcache (back-forward cache) après une déconnexion, sans
  // remonter React ni re-vérifier l'authentification — l'utilisateur voit
  // alors furtivement l'ancienne page comme s'il était encore connecté.
  // On ne recharge QUE si l'état d'authentification figé au moment de la
  // mise en cache ne correspond plus à la présence réelle d'un token en
  // localStorage (ex: déconnexion effectuée entre-temps) — un rechargement
  // systématique sur chaque navigation arrière casserait l'intérêt du
  // bfcache (retour instantané) pour toute navigation normale.
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      const hasStoredToken = Boolean(localStorage.getItem('access_token'));
      if (hasStoredToken !== state.isAuthenticated) {
        window.location.reload();
      }
    };
    window.addEventListener('pageshow', handlePageShow);
    return () => window.removeEventListener('pageshow', handlePageShow);
  }, [state.isAuthenticated]);

  // Verify stored token on startup
  useEffect(() => {
    const accessToken = localStorage.getItem('access_token');

    if (accessToken) {
      authService.getCurrentUser()
        .then((user) => {
          setState({
            user,
            accessToken,
            refreshToken: null,
            isAuthenticated: true,
            isLoading: false,
          });
        })
        .catch((error: unknown) => {
          console.error('[AuthContext] Échec de la récupération du profil utilisateur :', error);
          localStorage.removeItem('access_token');
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

      // Access token sauvé avant getCurrentUser() car l'intercepteur axios le
      // lit depuis localStorage. Le refresh token, lui, reste dans son cookie
      // HttpOnly : le JavaScript n'y a jamais accès.
      localStorage.setItem('access_token', data.access);

      let user: User;
      try {
        user = data.user ?? await authService.getCurrentUser();
      } catch {
        localStorage.removeItem('access_token');
        throw new Error('Impossible de récupérer le profil utilisateur');
      }

      setState({
        user,
        accessToken: data.access,
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
      });

      return user;
    } catch (error: unknown) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(getAuthErrorMessage(error, 'Email ou mot de passe incorrect'));
    }
  }, []);

  const loginWithGoogle = useCallback(async (accessToken: string) => {
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const data = await authService.googleLogin(accessToken);

      localStorage.setItem('access_token', data.access);

      setState({
        user: data.user,
        accessToken: data.access,
        refreshToken: null,
        isAuthenticated: true,
        isLoading: false,
      });

      return data.user;
    } catch (error: unknown) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error(getAuthErrorMessage(error, 'Connexion Google refusée. Réessayez.'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      // Révoque le refresh token (lu dans le cookie) et efface les cookies JWT.
      await authService.logout();
    } catch {
      // Ignore logout errors
    }

    localStorage.removeItem('access_token');

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
