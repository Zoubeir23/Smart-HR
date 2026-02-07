import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User, AuthState, UserRole } from '@/types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Données mock pour démo
const MOCK_USERS: Record<string, { password: string; user: User }> = {
  'admin@smarthr.com': {
    password: 'admin123',
    user: {
      id: 1,
      email: 'admin@smarthr.com',
      first_name: 'Moussa',
      last_name: 'Diop',
      role: 'ADMIN',
      avatar: undefined,
    },
  },
  'rh@smarthr.com': {
    password: 'rh123',
    user: {
      id: 2,
      email: 'rh@smarthr.com',
      first_name: 'Fatou',
      last_name: 'Ndiaye',
      role: 'RH',
      avatar: undefined,
    },
  },
  'employee@smarthr.com': {
    password: 'employee123',
    user: {
      id: 3,
      email: 'employee@smarthr.com',
      first_name: 'Amadou',
      last_name: 'Sow',
      role: 'EMPLOYEE',
      avatar: undefined,
    },
  },
  'candidate@smarthr.com': {
    password: 'candidate123',
    user: {
      id: 4,
      email: 'candidate@smarthr.com',
      first_name: 'Aïssatou',
      last_name: 'Ba',
      role: 'CANDIDATE',
      avatar: undefined,
    },
  },
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

  // Vérifier le token stocké au démarrage
  useEffect(() => {
    const storedToken = localStorage.getItem('accessToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setState({
          user,
          accessToken: storedToken,
          refreshToken: localStorage.getItem('refreshToken'),
          isAuthenticated: true,
          isLoading: false,
        });
      } catch {
        localStorage.clear();
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    // Simuler un délai réseau
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const mockUser = MOCK_USERS[email.toLowerCase()];
    
    if (!mockUser || mockUser.password !== password) {
      setState(prev => ({ ...prev, isLoading: false }));
      throw new Error('Email ou mot de passe incorrect');
    }
    
    const accessToken = `mock_access_${Date.now()}`;
    const refreshToken = `mock_refresh_${Date.now()}`;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(mockUser.user));
    
    setState({
      user: mockUser.user,
      accessToken,
      refreshToken,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  const hasRole = useCallback((roles: UserRole[]) => {
    if (!state.user) return false;
    return roles.includes(state.user.role);
  }, [state.user]);

  const hasPermission = useCallback((permission: string) => {
    if (!state.user) return false;
    const permissions = ROLE_PERMISSIONS[state.user.role];
    return permissions.includes(permission);
  }, [state.user]);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, hasRole, hasPermission }}>
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
