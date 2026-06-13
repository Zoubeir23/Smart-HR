import { Bell, Check, CheckCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { notificationService, type Notification } from '@/services/notificationService';
import { cn } from '@/lib/utils';

const NOTIFICATION_TYPE_COLORS: Record<string, string> = {
  leave_request: 'bg-blue-500',
  leave_approved: 'bg-green-500',
  leave_rejected: 'bg-red-500',
  application_received: 'bg-purple-500',
  task_assigned: 'bg-orange-500',
  system: 'bg-gray-400',
};

interface NotificationBellProps {
  /** Style du déclencheur selon l'emplacement. */
  variant?: 'navbar' | 'sidebar';
}

/**
 * Cloche de notifications réutilisable (navbar + sidebar).
 * Récupère les notifications réelles, affiche le compteur non-lu et un menu
 * déroulant identique partout. Remplace l'ancienne cloche statique de la sidebar.
 */
export default function NotificationBell({ variant = 'navbar' }: NotificationBellProps) {
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

  const triggerClassName =
    variant === 'sidebar'
      ? 'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground'
      : 'relative flex h-8 w-8 sm:h-9 sm:w-9 md:h-[38px] md:w-[38px] items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-[hsl(36,40%,91%)] dark:hover:bg-white/[0.07] hover:text-foreground flex-shrink-0';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className={triggerClassName} aria-label="Notifications">
          <Bell className="h-4 w-4 md:h-[17px] md:w-[17px]" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D62828] text-[9px] font-bold text-white ring-2 ring-card">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-80 sm:w-96 rounded-xl border-[hsl(34,30%,86%)] dark:border-[hsl(20,10%,22%)] shadow-lg p-0"
      >
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
                <div
                  className={cn(
                    'mt-0.5 h-2 w-2 shrink-0 rounded-full',
                    NOTIFICATION_TYPE_COLORS[notification.notification_type] ?? 'bg-gray-400',
                    notification.is_read && 'opacity-30'
                  )}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      'text-[13px] leading-snug line-clamp-1',
                      notification.is_read ? 'font-normal text-foreground/70' : 'font-semibold text-foreground'
                    )}
                  >
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
  );
}
