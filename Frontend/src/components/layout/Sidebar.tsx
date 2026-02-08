import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Brain,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  MessageSquare,
  Mic,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { NavGroup, UserRole } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import Logo from '@/components/common/Logo';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// Navigation organisée par groupes
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
      {
        title: 'Employés',
        href: '/employees',
        icon: Users,
        roles: ['ADMIN', 'RH'],
      },
      {
        title: 'Congés',
        href: '/leaves',
        icon: Calendar,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
      },
      {
        title: 'Tâches',
        href: '/tasks',
        icon: ClipboardList,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
      },
      {
        title: 'Présences',
        href: '/attendance',
        icon: Clock,
        roles: ['ADMIN', 'RH'],
      },
      {
        title: 'Paie',
        href: '/payroll',
        icon: CreditCard,
        roles: ['ADMIN', 'RH'],
      },
    ],
  },
  {
    title: 'Documents & Formation',
    items: [
      {
        title: 'Documents',
        href: '/documents',
        icon: FileText,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
      },
      {
        title: 'Formations',
        href: '/training',
        icon: GraduationCap,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
      },
    ],
  },
  {
    title: 'Recrutement',
    items: [
      {
        title: 'Offres d\'emploi',
        href: '/jobs',
        icon: Briefcase,
        roles: ['ADMIN', 'RH', 'CANDIDATE'],
      },
      {
        title: 'Mes candidatures',
        href: '/my-applications',
        icon: FileText,
        roles: ['CANDIDATE'],
      },
    ],
  },
  {
    title: 'Intelligence Artificielle',
    items: [
      {
        title: 'Analyse Churn',
        href: '/ai-insights',
        icon: Brain,
        roles: ['ADMIN', 'RH'],
      },
      {
        title: 'Chat IA',
        href: '/ai-chat',
        icon: MessageSquare,
        roles: ['ADMIN', 'RH'],
      },
      {
        title: 'Assistant Vocal',
        href: '/voice-assistant',
        icon: Mic,
        roles: ['ADMIN', 'RH'],
      },
    ],
  },
  {
    title: 'Configuration',
    items: [
      {
        title: 'Paramètres',
        href: '/settings',
        icon: Settings,
        roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'],
      },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();

  const isActive = (href: string) => location.pathname === href || location.pathname.startsWith(href + '/');

  // Filtrer les groupes de navigation en fonction du rôle
  const filteredGroups = navigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => hasRole(item.roles)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar"
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <Link to="/dashboard" className="flex items-center overflow-hidden">
          {collapsed ? (
            <Logo variant="icon" size="sm" />
          ) : (
            <Logo variant="full" size="sm" />
          )}
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-6">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <h3 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/60">
                  {group.title}
                </h3>
              )}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);

                const linkContent = (
                  <Link
                    to={item.href}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150',
                      active
                        ? 'bg-primary text-primary-foreground'
                        : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                    )}
                  >
                    <Icon className="h-5 w-5 flex-shrink-0" />
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="truncate"
                      >
                        {item.title}
                      </motion.span>
                    )}
                    {!collapsed && item.badge && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );

                if (collapsed) {
                  return (
                    <Tooltip key={item.href} delayDuration={0}>
                      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                      <TooltipContent side="right" className="flex items-center gap-2">
                        {item.title}
                        {item.badge && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
                            {item.badge}
                          </span>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return <div key={item.href}>{linkContent}</div>;
              })}
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* User & Logout */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          <div className={cn('mb-3 flex items-center gap-3 rounded-lg bg-sidebar-accent/50 p-3', collapsed && 'justify-center p-2')}>
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              {user.first_name[0]}
              {user.last_name[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground">{user.role}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-2">
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-10 w-10 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Déconnexion</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              onClick={logout}
              className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
              Déconnexion
            </Button>
          )}
        </div>
      </div>

      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-md transition-colors hover:text-foreground"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>
    </motion.aside>
  );
}
