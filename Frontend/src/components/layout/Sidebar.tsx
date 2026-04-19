import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Calendar,
  ClipboardList,
  Clock,
  CreditCard,
  FileText,
  GraduationCap,
  Briefcase,
  BarChart3,
  MessageSquare,
  Mic,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  User,
  Search,
  Bell,
  Inbox,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { NavGroup, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navigationGroups: NavGroup[] = [
  {
    title: 'Principal',
    items: [
      {
        title: 'Tableau de bord',
        href: '/dashboard',
        icon: LayoutDashboard,
        roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'],
      },
    ],
  },
  {
    title: 'Gestion RH',
    items: [
      { title: 'Employés', href: '/employees', icon: Users, roles: ['ADMIN', 'RH'] },
      { title: 'Congés', href: '/leaves', icon: Calendar, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
      { title: 'Tâches', href: '/tasks', icon: ClipboardList, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
      { title: 'Présences', href: '/attendance', icon: Clock, roles: ['ADMIN', 'RH'] },
      { title: 'Paie', href: '/payroll', icon: CreditCard, roles: ['ADMIN', 'RH'] },
    ],
  },
  {
    title: 'Documents',
    items: [
      { title: 'Documents', href: '/documents', icon: FileText, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
      { title: 'Formations', href: '/training', icon: GraduationCap, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
    ],
  },
  {
    title: 'Recrutement',
    items: [
      { title: "Offres d'emploi", href: '/jobs', icon: Briefcase, roles: ['ADMIN', 'RH', 'CANDIDATE'] },
      { title: 'Mes candidatures', href: '/my-applications', icon: FileText, roles: ['CANDIDATE'] },
    ],
  },
  {
    title: 'Intelligence IA',
    items: [
      { title: 'Analyse Churn', href: '/ai-insights', icon: BarChart3, roles: ['ADMIN', 'RH'] },
      { title: 'Chat IA', href: '/ai-chat', icon: MessageSquare, roles: ['ADMIN', 'RH'] },
      { title: 'Assistant Vocal', href: '/voice-assistant', icon: Mic, roles: ['ADMIN', 'RH'] },
    ],
  },
  {
    title: 'Système',
    items: [
      { title: 'Paramètres', href: '/settings', icon: Settings, roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'] },
      { title: 'Sécurité', href: '/security', icon: Shield, roles: ['ADMIN'] },
    ],
  },
];

const roleColors: Record<string, string> = {
  ADMIN: 'from-rose-500 to-pink-600',
  RH: 'from-indigo-500 to-blue-600',
  EMPLOYEE: 'from-emerald-500 to-teal-600',
  CANDIDATE: 'from-amber-500 to-orange-600',
};

const roleLabels: Record<string, string> = {
  ADMIN: 'Administrateur',
  RH: 'Responsable RH',
  EMPLOYEE: 'Employé',
  CANDIDATE: 'Candidat',
};

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const { theme, setTheme } = useTheme();

  const isActive = (href: string) =>
    location.pathname === href || location.pathname.startsWith(href + '/');

  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasRole(item.roles)),
    }))
    .filter((group) => group.items.length > 0);

  const userInitials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`
    : '?';

  const avatarGradient = roleColors[user?.role ?? ''] ?? 'from-slate-500 to-slate-700';

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 272 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #08111e 0%, #0a1628 50%, #07101c 100%)' }}
    >
      {/* Subtle grid texture overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='20' height='20' viewBox='0 0 20 20' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='1' cy='1' r='0.5'/%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      {/* Glow accent top-right corner */}
      <div className="pointer-events-none absolute -right-16 top-0 h-48 w-48 rounded-full bg-indigo-600/10 blur-3xl" />

      {/* ── Header ── */}
      <div
        className="relative flex h-[60px] shrink-0 items-center border-b px-3"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <Link
          to="/dashboard"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2.5 overflow-hidden',
            collapsed && 'justify-center'
          )}
        >
          {/* Logo mark */}
          <div
            className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{
              background: 'linear-gradient(135deg, #c41e1e 0%, #D62828 100%)',
              boxShadow: '0 0 16px rgba(214,40,40,0.45)',
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                key="brand"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="min-w-0"
              >
                <span className="text-[15px] font-bold tracking-tight text-white">
                  Smart
                </span>
                <span
                  className="text-[15px] font-bold tracking-tight"
                  style={{ color: '#D62828' }}
                >
                  -HR
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {!collapsed && (
          <button
            onClick={onToggle}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-white/8"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Search + Actions (expanded only) ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0 px-3 py-3"
          >
            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.25)' }}
                />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  className="h-8 w-full rounded-lg pl-8 pr-3 text-xs transition-all focus:outline-none"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    color: 'rgba(255,255,255,0.7)',
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(214,40,40,0.4)';
                    e.currentTarget.style.background = 'rgba(214,40,40,0.08)';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.border = '1px solid rgba(255,255,255,0.08)';
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                />
              </div>
              <button
                className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-white/8"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                <Bell className="h-3.5 w-3.5" />
                <span
                  className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-rose-500"
                  style={{ boxShadow: '0 0 6px rgba(239,68,68,0.8)' }}
                />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Navigation ── */}
      <ScrollArea className="flex-1 px-2.5 py-1">
        <nav className="space-y-4 pb-2">
          {filteredGroups.map((group) => (
            <div key={group.title}>
              {/* Group label */}
              {!collapsed && (
                <div className="mb-1 flex items-center gap-2 px-2 py-1">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-[0.12em]"
                    style={{ color: 'rgba(255,255,255,0.22)' }}
                  >
                    {group.title}
                  </span>
                  <div
                    className="h-px flex-1"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  />
                </div>
              )}

              {/* Nav items */}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  const content = (
                    <Link
                      to={item.href}
                      className={cn(
                        'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-150',
                        collapsed && 'justify-center px-2'
                      )}
                      style={
                        active
                          ? {
                              background: 'rgba(214,40,40,0.18)',
                              color: '#fff',
                            }
                          : {
                              color: 'rgba(255,255,255,0.45)',
                            }
                      }
                      onMouseEnter={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          e.currentTarget.style.background = '';
                          e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                        }
                      }}
                    >
                      {/* Active left accent */}
                      {active && (
                        <span
                          className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-full"
                          style={{
                            background: 'linear-gradient(180deg, #D62828, #e63c3c)',
                            boxShadow: '0 0 8px rgba(214,40,40,0.65)',
                          }}
                        />
                      )}

                      {/* Icon */}
                      <span
                        className={cn(
                          'flex h-[18px] w-[18px] shrink-0 items-center justify-center',
                          active ? 'text-red-300' : ''
                        )}
                      >
                        <Icon className="h-[15px] w-[15px]" />
                      </span>

                      <AnimatePresence mode="wait">
                        {!collapsed && (
                          <motion.span
                            key="label"
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -6 }}
                            transition={{ duration: 0.18 }}
                            className="truncate"
                          >
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {!collapsed && item.badge !== undefined && (
                        <span
                          className="ml-auto flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
                          style={{
                            background: 'rgba(239,68,68,0.2)',
                            color: '#fca5a5',
                          }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );

                  if (collapsed) {
                    return (
                      <Tooltip key={item.href} delayDuration={0}>
                        <TooltipTrigger asChild>{content}</TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="ml-1 border-0 text-xs"
                          style={{ background: '#1e2a3a', color: 'rgba(255,255,255,0.9)' }}
                        >
                          {item.title}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return <div key={item.href}>{content}</div>;
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* ── Dark Mode Toggle ── */}
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="shrink-0 px-3 pb-2"
          >
            <div
              className="flex items-center justify-between rounded-lg px-3 py-2"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Mode sombre
              </span>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                className="scale-75"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── User Profile ── */}
      <div
        className="shrink-0 border-t p-2.5"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        {user && (
          <div
            className={cn(
              'mb-1.5 flex items-center rounded-xl p-2 transition-colors',
              collapsed ? 'justify-center' : 'gap-2.5'
            )}
            style={{
              background: collapsed ? '' : 'rgba(255,255,255,0.04)',
              border: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
            }}
          >
            {/* Avatar with gradient ring */}
            <div
              className="relative shrink-0 rounded-full p-[2px]"
              style={{ background: `linear-gradient(135deg, ${avatarGradient.replace('from-', '').replace(' to-', ', ')})` }}
            >
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white',
                  `bg-gradient-to-br ${avatarGradient}`
                )}
              >
                {userInitials}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {!collapsed && (
                <motion.div
                  key="user-info"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.18 }}
                  className="min-w-0 flex-1"
                >
                  <p className="truncate text-[12px] font-semibold text-white">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="truncate text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    {roleLabels[user.role] ?? user.role}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Action buttons */}
        <div className={cn('flex gap-1', collapsed ? 'flex-col items-center' : '')}>
          {!collapsed && (
            <button
              className="flex flex-1 items-center gap-2 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors hover:bg-white/6"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onClick={() => navigate('/profile')}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              <User className="h-3.5 w-3.5" />
              Mon profil
            </button>
          )}

          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={logout}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#fca5a5';
                    e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'rgba(255,255,255,0.3)';
                    e.currentTarget.style.background = '';
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" style={{ background: '#1e2a3a', color: 'rgba(255,255,255,0.9)', border: 'none' }}>
                Déconnexion
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={logout}
              className="flex h-7 w-7 items-center justify-center rounded-lg transition-colors"
              style={{ color: 'rgba(255,255,255,0.25)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#fca5a5';
                e.currentTarget.style.background = 'rgba(239,68,68,0.12)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'rgba(255,255,255,0.25)';
                e.currentTarget.style.background = '';
              }}
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Expand button (collapsed state) ── */}
      {collapsed && (
        <div className="absolute -right-3.5 top-[72px]">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className="flex h-7 w-7 items-center justify-center rounded-full border shadow-md transition-all hover:scale-110"
                style={{
                  background: '#0a1628',
                  borderColor: 'rgba(214,40,40,0.3)',
                  color: 'rgba(214,40,40,0.85)',
                  boxShadow: '0 0 12px rgba(214,40,40,0.2)',
                }}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right" style={{ background: '#1e2a3a', color: 'rgba(255,255,255,0.9)', border: 'none' }}>
              Agrandir le menu
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </motion.aside>
  );
}
