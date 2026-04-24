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
  PanelLeftClose,
  PanelLeft,
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
    title: 'Documents & Formation',
    items: [
      { title: 'Documents', href: '/documents', icon: FileText, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
      { title: 'Formations', href: '/training', icon: GraduationCap, roles: ['ADMIN', 'RH', 'EMPLOYEE'] },
    ],
  },
  {
    title: 'Recrutement',
    items: [
      { title: 'Offres d\'emploi', href: '/jobs', icon: Briefcase, roles: ['ADMIN', 'RH', 'CANDIDATE'] },
      { title: 'Mes candidatures', href: '/my-applications', icon: FileText, roles: ['CANDIDATE'] },
    ],
  },
  {
    title: 'Analytics & IA',
    items: [
      { title: 'Analyse Churn', href: '/ai-insights', icon: BarChart3, roles: ['ADMIN', 'RH'] },
      { title: 'Chat IA', href: '/ai-chat', icon: MessageSquare, roles: ['ADMIN', 'RH'] },
      { title: 'Assistant Vocal', href: '/voice-assistant', icon: Mic, roles: ['ADMIN', 'RH'] },
    ],
  },
  {
    title: 'Configuration',
    items: [
      { title: 'Paramètres', href: '/settings', icon: Settings, roles: ['ADMIN', 'RH', 'EMPLOYEE', 'CANDIDATE'] },
      { title: 'Sécurité', href: '/security', icon: Shield, roles: ['ADMIN'] },
    ],
  },
];

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

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-sidebar-border bg-sidebar sidebar-grid-overlay"
    >
      {/* Header : Logo + Toggle */}
      <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-3">
        <Link
          to="/dashboard"
          className={cn(
            'flex min-w-0 items-center overflow-hidden',
            collapsed && 'justify-center'
          )}
        >
          {/* Logo mark DS : ✦ Sparkles sur carré rouge gradient + glow rouge */}
          <div
            className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[10px]"
            style={{
              background: 'linear-gradient(135deg, #c41e1e, #D62828)',
              boxShadow: '0 0 16px rgba(214,40,40,0.45)',
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <span className="ml-1 truncate font-extrabold tracking-tight text-[15px]">
              <span className="text-white/90">Smart</span>
              <span className="text-[#fca5a5]">-HR</span>
            </span>
          )}
        </Link>
        {!collapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggle}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Réduire le menu</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Utilitaires : Recherche, Notifications (mode étendu) */}
      {!collapsed && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 px-3 py-3"
        >
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="h-9 w-full rounded-lg border border-sidebar-border bg-sidebar-accent/60 pl-8 pr-3 text-sm text-sidebar-accent-foreground placeholder:text-sidebar-foreground/50 focus:outline-none focus:ring-2 focus:ring-sidebar-primary/30"
            />
          </div>
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
            <Inbox className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="relative h-9 w-9 shrink-0">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
              3
            </span>
          </Button>
        </motion.div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-5">
          {filteredGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <h3 className="mb-2 px-2 text-[10px] font-bold uppercase tracking-widest text-sidebar-foreground/60">
                  {group.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.href);

                  const linkContent = (
                    <Link
                      to={item.href}
                      className={cn(
                        'flex items-center gap-3 rounded-lg px-2.5 py-2 text-sm font-medium transition-all duration-150',
                        active
                          ? 'bg-[rgba(214,40,40,0.18)] text-white shadow-[inset_3px_0_0_0_#D62828]'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
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
                })}
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
          <div
            className={cn(
              'mb-2 flex items-center gap-2 rounded-lg p-2',
              collapsed ? 'justify-center' : 'bg-sidebar-accent/60'
            )}
          >
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-medium text-sidebar-primary-foreground">
              {user.first_name?.[0]}
              {user.last_name?.[0]}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white/90">
                  {user.first_name} {user.last_name}
                </p>
                <p className="truncate text-xs text-sidebar-foreground">{user.role}</p>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {!collapsed && (
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2"
              onClick={() => navigate('/profile')}
            >
              <User className="h-4 w-4" />
              Mon profil
            </Button>
          )}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={logout}
                  className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Déconnexion</TooltipContent>
            </Tooltip>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="h-9 w-9 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Bouton Expand (mode compact) */}
      {collapsed && (
        <div className="absolute -right-3 top-20">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <button
                onClick={onToggle}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background shadow-sm transition-colors hover:bg-muted"
              >
                <PanelLeft className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Agrandir le menu</TooltipContent>
            </Tooltip>
        </div>
      )}
    </motion.aside>
  );
}
