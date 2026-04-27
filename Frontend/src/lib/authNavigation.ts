import { USER_ROLES, type UserRole } from '@/types';

const ROLE_ALLOWED_ROUTE_ROOTS: Record<UserRole, string[]> = {
  ADMIN: [
    '/dashboard',
    '/employees',
    '/leaves',
    '/tasks',
    '/attendance',
    '/payroll',
    '/documents',
    '/training',
    '/jobs',
    '/my-applications',
    '/ai-insights',
    '/ai-chat',
    '/voice-assistant',
    '/settings',
    '/profile',
    '/security',
  ],
  RH: [
    '/dashboard',
    '/employees',
    '/leaves',
    '/tasks',
    '/attendance',
    '/payroll',
    '/documents',
    '/training',
    '/jobs',
    '/my-applications',
    '/ai-insights',
    '/ai-chat',
    '/voice-assistant',
    '/settings',
    '/profile',
  ],
  EMPLOYEE: ['/dashboard', '/leaves', '/tasks', '/documents', '/training', '/settings', '/profile'],
  CANDIDATE: ['/dashboard', '/jobs', '/my-applications', '/settings', '/profile'],
};

const ROLE_HOME_PATHS: Record<UserRole, string> = {
  ADMIN: '/dashboard',
  RH: '/dashboard',
  EMPLOYEE: '/dashboard',
  CANDIDATE: '/dashboard',
};

function isPathAllowed(path: string, allowedRoots: string[]) {
  return allowedRoots.some((root) => path === root || path.startsWith(`${root}/`));
}

function normalizeRole(role: string | undefined): UserRole | null {
  if (!role) return null;

  const normalizedRole = role.toUpperCase();
  return USER_ROLES.includes(normalizedRole as UserRole) ? (normalizedRole as UserRole) : null;
}

export function getSafePostLoginPath(role: string | undefined, requestedPath?: string): string {
  const normalizedRole = normalizeRole(role);

  if (!normalizedRole) {
    return '/dashboard';
  }

  const fallbackPath = ROLE_HOME_PATHS[normalizedRole];

  if (!requestedPath) {
    return fallbackPath;
  }

  const allowedRoots = ROLE_ALLOWED_ROUTE_ROOTS[normalizedRole];

  return isPathAllowed(requestedPath, allowedRoots) ? requestedPath : fallbackPath;
}
