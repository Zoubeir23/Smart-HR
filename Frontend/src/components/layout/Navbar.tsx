import { Bell, Moon, Sun, Menu, LogOut, User, Settings, Check, CheckCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import Logo from '@/components/common/Logo';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationService, type Notification } from '@/services/notificationService';
import { cn } from '@/lib/utils';

interface NavbarProps {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
}

const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  leave_request: 'bg-blue-500',
  leave_approved: 'bg-green-500',
  leave_rejected: 'bg-red-500',
  application_received: 'bg-purple-500',
  task_assigned: 'bg-orange-500',
  system: 'bg-gray-400',
};

export default function Navbar({ onMenuClick, showMenuButton }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notificationData } = useQuery({
    queryKey: ['notifications'],
    queryFn: notificationService.list,
    refetchInterval: 30_000,
    staleTime: 15_000,
  });

  const notifications = notificationData?.results ?? [];
  const unreadCount = notificationData?.unread_count ?? 0;

  const markReadMutation = useMutation({
    mutationFn: notificationService.markRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: notificationService.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.target_url) {
      navigate(notification.target_url);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center gap-2 sm:gap-3 md:gap-4 lg:gap-5 border-b border-[hsl(34,30%,86%)] bg-card px-3 sm:px-4 md:px-5 lg:px-6 dark:border-[hsl(20,10%,18%)]">

      {/* Bouton menu mobile */}
      {showMenuButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-9 w-9 sm:h-10 sm:w-10"
        >
          <Menu className="h-4 w-4 sm:h-5 sm:w-5" />
        </Button>
      )}

      {/* Logo mobile uniquement */}
      <Link to="/dashboard" className="flex items-center shrink-0 lg:hidden">
        <Logo variant="full" size="sm" />
      </Link>

      <div className="flex-1 min-w-0" />

      {/* Actions droite */}
      <div className="flex items-center gap-0.5 sm:gap-1 md:gap-1.5 flex-shrink-0">

        {/* Toggle dark mode */}
        <button
          onClick={toggleTheme}
          className="flex h-8 w-8 sm:h-9 sm:w-9 md:h-[38px] md:w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] dark:hover:bg-white/[0.07] hover:text-foreground flex-shrink-0"
        >
          {theme === 'dark'
            ? <Sun className="h-[15px] w-[15px] sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" />
            : <Moon className="h-[15px] w-[15px] sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" />
          }
        </button>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative flex h-8 w-8 sm:h-9 sm:w-9 md:h-[38px] md:w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] dark:hover:bg-white/[0.07] hover:text-foreground flex-shrink-0">
              <Bell className="h-[15px] w-[15px] sm:h-4 sm:w-4 md:h-[17px] md:w-[17px]" />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D62828] text-[9px] font-bold text-white ring-2 ring-card sm:right-[6px] sm:top-[6px]">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 sm:w-96 rounded-xl border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)] shadow-lg p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)]">
              <span className="font-semibold text-foreground text-sm">
                Notifications
                {unreadCount > 0 && (
                  <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#D62828] px-1.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllReadMutation.mutate()}
                  disabled={markAllReadMutation.isPending}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#c41e1e] hover:text-[#D62828] disabled:opacity-50"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Tout lire
                </button>
              )}
            </div>

            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-[hsl(36,40%,96%)] dark:hover:bg-white/[0.06]',
                      !notification.is_read && 'bg-[hsl(36,40%,98%)] dark:bg-white/[0.03]'
                    )}
                  >
                    <div className={cn(
                      'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                      NOTIFICATION_TYPE_COLORS[notification.notification_type] ?? 'bg-gray-400',
                      notification.is_read && 'opacity-30'
                    )} />
                    <div className="min-w-0 flex-1">
                      <p className={cn(
                        'text-[13px] leading-snug line-clamp-1',
                        notification.is_read ? 'font-normal text-foreground/70' : 'font-semibold text-foreground'
                      )}>
                        {notification.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground/50">
                        {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                    {!notification.is_read && (
                      <Check className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/40" />
                    )}
                  </button>
                ))
              )}
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-1.5 sm:gap-2 md:gap-2.5 rounded-[10px] px-1.5 sm:px-2 py-1 sm:py-1.5 transition-colors hover:bg-[hsl(36,40%,91%)] dark:hover:bg-white/[0.07] flex-shrink-0">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-[34px] md:w-[34px] flex-shrink-0 items-center justify-center rounded-[10px] text-[11px] sm:text-[12px] md:text-[13px] font-bold text-white bg-gradient-to-br from-brand-red-light to-brand-red-dark">
                {user?.first_name?.[0]}{user?.last_name?.[0]}
              </div>
              <div className="hidden text-left sm:block">
                <p className="text-[11px] sm:text-[12px] md:text-[13px] font-semibold text-foreground leading-tight">
                  {user?.first_name}
                </p>
                <p className="text-[8px] sm:text-[9px] md:text-[10px] font-semibold uppercase tracking-[0.05em] sm:tracking-[0.08em] md:tracking-[0.1em] text-muted-foreground truncate">
                  {user?.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 sm:w-56 rounded-xl border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)] shadow-lg">
            <DropdownMenuLabel className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-[13px] font-semibold">Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)]" />
            <DropdownMenuItem asChild>
              <Link to="/profile" className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] hover:bg-[hsl(36,40%,96%)] dark:hover:bg-white/[0.06]">
                <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                Profil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/settings" className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] hover:bg-[hsl(36,40%,96%)] dark:hover:bg-white/[0.06]">
                <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground flex-shrink-0" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)]" />
            <DropdownMenuItem
              className="flex cursor-pointer items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-[13px] text-[#c41e1e] hover:bg-[hsl(0,69%,50%,0.06)] dark:hover:bg-[hsl(0,69%,50%,0.12)] hover:text-[#D62828]"
              onClick={() => logout()}
            >
              <LogOut className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
