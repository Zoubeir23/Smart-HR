import { useState, useEffect } from 'react';
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
  Volume2,
  Settings,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  Shield,
  User,
  Scale,
  Megaphone,
  TrendingUp,
  ChevronDown,
  Archive,
  Building2,
  Database,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';
import { NavGroup, NavItem, UserRole, USER_ROLES } from '@/types';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Switch } from '@/components/ui/switch';
import NotificationBell from '@/components/layout/NotificationBell';

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
      {
        title: 'Calendrier',
        href: '/calendar',
        icon: Calendar,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
      },
    ],
  },
  {
    title: 'Gestion RH',
    items: [
      {
        title: 'Personnel ATS',
        icon: Users,
        roles: ['ADMIN', 'RH'],
        children: [
          { title: 'Liste des actifs', href: '/employees', icon: Users, roles: ['ADMIN', 'RH'] },
          { title: 'Ex-fonctionnaires', href: '/employees?archived=true', icon: Archive, roles: ['ADMIN', 'RH'] },
        ],
      },
      {
        title: 'Carrières & Absences',
        icon: TrendingUp,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
        children: [
          { title: 'Congés', href: '/leaves', icon: Calendar, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
          { title: 'Présences', href: '/attendance', icon: Clock, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
          { title: 'Performance', href: '/performance', icon: TrendingUp, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
          { title: 'Tâches', href: '/tasks', icon: ClipboardList, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
        ],
      },
      {
        title: 'Gestion Financière',
        icon: CreditCard,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
        children: [
          { title: 'Paie', href: '/payroll', icon: CreditCard, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
        ],
      },
      {
        title: 'Documents Admin',
        icon: FileText,
        roles: ['ADMIN', 'RH', 'EMPLOYEE'],
        children: [
          { title: 'Documents', href: '/documents', icon: FileText, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
          { title: 'Formations', href: '/training', icon: GraduationCap, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
        ],
      },
      {
        title: 'Organisation',
        icon: Building2,
        roles: ['ADMIN', 'RH'],
        children: [
          { title: 'Départements', href: '/departments', icon: Building2, roles: ['ADMIN', 'RH'] },
          { title: 'Services', href: '/services', icon: Briefcase, roles: ['ADMIN', 'RH'] },
          { title: 'Postes', href: '/positions', icon: Briefcase, roles: ['ADMIN', 'RH'] },
          { title: 'Référentiels', href: '/reference-tables', icon: Database, roles: ['ADMIN', 'RH'] },
          { title: 'Contrats', href: '/contracts', icon: FileText, roles: ['ADMIN', 'RH'] },
          { title: 'Discipline', href: '/discipline', icon: Scale, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
          { title: 'Communication', href: '/communication', icon: Megaphone, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
        ],
      },
    ],
  },
  {
    title: 'Recrutement',
    items: [
      { title: "Offres d'emploi", href: '/jobs', icon: Briefcase, roles: ['ADMIN', 'RH', 'CANDIDATE'] },
      { title: 'Candidatures', href: '/applications', icon: Users, roles: ['ADMIN', 'RH'] },
      { title: 'Mes candidatures', href: '/my-applications', icon: FileText, roles: ['CANDIDATE'] },
    ],
  },
  {
    title: 'Analytics & IA',
    items: [
      { title: 'Analytiques RH', href: '/analytics', icon: BarChart3, roles: ['ADMIN', 'RH'] },
      { title: 'Analyse Churn', href: '/ai-insights', icon: BarChart3, roles: ['ADMIN', 'RH'] },
      { title: 'Chat IA', href: '/ai-chat', icon: MessageSquare, roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'] },
      { title: 'Recruteur IA', href: '/recruteur-ia', icon: Mic, roles: ['ADMIN', 'RH'] },
      { title: 'Assistant Vocal', href: '/voice-assistant', icon: Volume2, roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'] },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Paramètres', href: '/settings', icon: Settings, roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'] },
      { title: 'Sécurité', href: '/security', icon: Shield, roles: ['ADMIN'] },
      { title: 'Gestion utilisateurs', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasRole } = useAuth();
  const { theme, setTheme } = useTheme();
  const [openDropdowns, setOpenDropdowns] = useState<Set<string>>(new Set());

  const normalizedRole = typeof user?.role === 'string' ? user.role.toUpperCase() : '';
  const hasValidRole = USER_ROLES.includes(normalizedRole as UserRole);

  // All hrefs that carry a query string — used to detect when a "clean" sibling
  // should be deactivated because a more-specific sibling matches the current URL.
  const queryParamHrefs = navigationGroups
    .flatMap((g) => g.items)
    .flatMap((item) => (item.children ?? [item]))
    .map((item) => item.href ?? '')
    .filter((href) => href.includes('?'));

  const isActive = (href: string) => {
    const [path, query] = href.split('?');
    const pathMatch = location.pathname === path || location.pathname.startsWith(path + '/');
    if (!pathMatch) return false;
    if (query) {
      const hrefParams = new URLSearchParams(query);
      const currentParams = new URLSearchParams(location.search);
      for (const [key, value] of hrefParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    }
    // No query string on this href: deactivate only if a sibling link with query
    // params is currently active (i.e. its query params match the current URL).
    const currentParams = new URLSearchParams(location.search);
    return !queryParamHrefs.some((siblingHref) => {
      const [siblingPath, siblingQuery] = siblingHref.split('?');
      if (siblingPath !== path) return false;
      const siblingParams = new URLSearchParams(siblingQuery);
      for (const [key, value] of siblingParams.entries()) {
        if (currentParams.get(key) !== value) return false;
      }
      return true;
    });
  };

  const isDropdownActive = (children: NavItem[]): boolean =>
    children.some(child => !!child.href && isActive(child.href));

  // Auto-open the dropdown that contains the current active route
  useEffect(() => {
    setOpenDropdowns(prev => {
      const autoOpen = new Set<string>();
      navigationGroups.forEach(group => {
        group.items.forEach(item => {
          if (item.children && item.children.some(child => {
            if (!child.href) return false;
            const path = child.href.split('?')[0];
            return location.pathname === path || location.pathname.startsWith(path + '/');
          })) {
            autoOpen.add(item.title);
          }
        });
      });
      return new Set([...prev, ...autoOpen]);
    });
  }, [location.pathname]);

  const toggleDropdown = (title: string) => {
    setOpenDropdowns(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const filteredGroups = navigationGroups
    .map(group => ({
      ...group,
      items: group.items
        .map(item => {
          if (item.children) {
            const filteredChildren = item.children.filter(child => hasRole(child.roles));
            if (filteredChildren.length === 0) return null;
            return { ...item, children: filteredChildren };
          }
          return hasRole(item.roles) ? item : null;
        })
        .filter((item): item is NavItem => item !== null),
    }))
    .filter(group => group.items.length > 0);

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;

    // ── Dropdown parent item ──────────────────────────────────────────
    if (item.children) {
      const isOpen = openDropdowns.has(item.title);
      const hasActiveChild = isDropdownActive(item.children);

      if (collapsed) {
        const firstChild = item.children[0];
        return (
          <Tooltip key={item.title} delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={() => firstChild?.href && navigate(firstChild.href.split('?')[0])}
                className={cn(
                  'group/item flex w-full items-center justify-center rounded-lg p-2 transition-all duration-150',
                  hasActiveChild
                    ? 'bg-gradient-to-r from-[#D62828] to-[#e63c3c] text-white shadow-[0_4px_12px_rgba(214,40,40,0.30)]'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <div className={cn(
                  'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150',
                  hasActiveChild ? 'bg-white/15' : 'group-hover/item:bg-sidebar-accent-foreground/10'
                )}>
                  <Icon className="h-4 w-4 flex-shrink-0" />
                </div>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{item.title}</TooltipContent>
          </Tooltip>
        );
      }

      return (
        <div key={item.title}>
          <button
            onClick={() => toggleDropdown(item.title)}
            className={cn(
              'group/item relative flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
              hasActiveChild
                ? 'bg-sidebar-primary/10 text-sidebar-primary hover:bg-sidebar-primary/15'
                : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
            )}
          >
            <div className={cn(
              'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150',
              hasActiveChild ? 'bg-sidebar-primary/15' : 'group-hover/item:bg-sidebar-accent-foreground/10'
            )}>
              <Icon className="h-4 w-4 flex-shrink-0" />
            </div>
            <AnimatePresence mode="wait">
              <motion.span
                key="text"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex-1 truncate text-left"
              >
                {item.title}
              </motion.span>
            </AnimatePresence>
            <motion.div
              animate={{ rotate: isOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0"
            >
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </motion.div>
          </button>

          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.div
                key="dropdown-children"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                style={{ overflow: 'hidden' }}
                className="mt-0.5 ml-3 space-y-0.5 border-l border-sidebar-border pl-3"
              >
                {item.children.map(child => {
                  const ChildIcon = child.icon;
                  const childActive = !!child.href && isActive(child.href);
                  return (
                    <Link
                      key={`${child.href}-${child.title}`}
                      to={child.href || '#'}
                      className={cn(
                        'group/child flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-all duration-150',
                        childActive
                          ? 'bg-gradient-to-r from-[#D62828] to-[#e63c3c] text-white shadow-[0_4px_12px_rgba(214,40,40,0.30)]'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <ChildIcon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{child.title}</span>
                    </Link>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    }

    // ── Regular link item ─────────────────────────────────────────────
    const active = !!item.href && isActive(item.href);

    const linkContent = (
      <Link
        to={item.href || '#'}
        className={cn(
          'group/item relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
          collapsed && 'justify-center px-2',
          active
            ? 'bg-gradient-to-r from-[#D62828] to-[#e63c3c] text-white shadow-[0_4px_12px_rgba(214,40,40,0.30)]'
            : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
        )}
      >
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-all duration-150',
          active ? 'bg-white/15' : 'group-hover/item:bg-sidebar-accent-foreground/10'
        )}>
          <Icon className="h-4 w-4 flex-shrink-0" />
        </div>
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.span
              key="text"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="truncate"
            >
              {item.title}
            </motion.span>
          )}
        </AnimatePresence>
        {!collapsed && item.badge !== undefined && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-medium text-destructive-foreground">
            {item.badge}
          </span>
        )}
        {active && !collapsed && (
          <motion.div
            layoutId="active-indicator"
            className="absolute right-2.5 h-1.5 w-1.5 rounded-full bg-white/70"
          />
        )}
      </Link>
    );

    if (collapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right">
            {item.title}
            {item.badge !== undefined && ` (${item.badge})`}
          </TooltipContent>
        </Tooltip>
      );
    }
    return <div key={item.href}>{linkContent}</div>;
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar sidebar-grid-overlay"
    >
      {/* Header : Logo + Toggle */}
      <div
        className={cn(
          'border-b border-sidebar-border',
          collapsed
            ? 'flex flex-col items-center gap-1 py-2'
            : 'flex h-16 items-center justify-between px-3'
        )}
      >
        <Link
          to="/dashboard"
          className={cn(
            'flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-md px-1 py-1',
            collapsed && 'flex-none justify-center px-0'
          )}
        >
          {collapsed ? (
            <img src="/logo-icon.svg" alt="Smart-HR" className="h-9 w-9 flex-shrink-0" />
          ) : (
            theme === 'dark' ? (
              <div className="flex items-center gap-2">
                <img src="/logo-icon.svg" alt="Smart-HR" className="h-9 w-9 flex-shrink-0" />
                <span className="truncate text-[17px] font-extrabold leading-none tracking-tight">
                  <span className="text-white">Smart</span>
                  <span className="text-primary">-HR</span>
                </span>
              </div>
            ) : (
              <img src="/logo-lockup.svg" alt="Smart-HR" className="h-9 w-auto" />
            )
          )}
        </Link>
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggle}
              className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
            >
              {collapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {collapsed ? 'Agrandir le menu' : 'Réduire le menu'}
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Notifications (mode étendu) */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center justify-end px-3 py-3"
        >
          <NotificationBell variant="sidebar" />
        </motion.div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-5">
          {user && !hasValidRole && !collapsed && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning-foreground">
              Aucun menu charge: le role utilisateur recu est invalide.
              Deconnecte-toi puis reconnecte-toi pour rafraichir la session.
            </div>
          )}

          {hasValidRole && filteredGroups.length === 0 && !collapsed && (
            <div className="rounded-lg border border-border bg-sidebar-accent/40 p-3 text-xs text-sidebar-foreground">
              Aucun element de navigation disponible pour ce compte.
            </div>
          )}

          {filteredGroups.map((group, groupIndex) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <div className={cn('flex items-center gap-2 px-2 mb-1.5', groupIndex > 0 && 'pt-1')}>
                  <h3 className="text-[9.5px] font-bold uppercase tracking-[0.12em] text-sidebar-foreground/40 shrink-0">
                    {group.title}
                  </h3>
                  <div className="h-px flex-1 bg-sidebar-border/40" />
                </div>
              )}
              <div className="space-y-0.5">
                {group.items.map(item => renderNavItem(item))}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Mode sombre (étendu uniquement) */}
      {!collapsed && (
        <div className="border-t border-sidebar-border px-3 py-3">
          <div className="flex items-center justify-between rounded-lg bg-sidebar-accent/60 px-3 py-2">
            <span className="text-sm font-medium text-sidebar-foreground">Mode sombre</span>
            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          </div>
        </div>
      )}

      {/* Profil & Logout */}
      <div className="border-t border-sidebar-border p-3">
        {user && (
          collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  onClick={() => navigate('/profile')}
                  className="mb-2 flex w-full items-center justify-center rounded-lg p-1.5 transition-colors hover:bg-sidebar-accent/60"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground ring-2 ring-sidebar-primary/20">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {user.first_name} {user.last_name} — {user.role}
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="mb-2 flex w-full items-center gap-2.5 rounded-lg bg-sidebar-accent/50 p-2.5 text-left transition-all hover:bg-sidebar-accent hover:shadow-sm"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#D62828] to-[#e63c3c] text-sm font-bold text-white shadow-sm">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-sidebar-accent-foreground">
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate text-[11px] text-sidebar-foreground/50">{user.role}</p>
              </div>
              <User className="h-3.5 w-3.5 shrink-0 text-sidebar-foreground/30" />
            </button>
          )
        )}

        <div className="flex items-center gap-1">
          {!collapsed && <div className="flex-1" />}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-9 w-9 text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Déconnexion</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="w-full gap-2 justify-start text-sidebar-foreground/50 hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Déconnexion
            </Button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
