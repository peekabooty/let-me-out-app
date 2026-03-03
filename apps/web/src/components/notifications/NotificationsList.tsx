import { Bell, BellDot, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNotifications, useMarkNotificationAsRead } from '../../hooks/use-notifications';

/**
 * Component that displays a list of notifications with read/unread states.
 * Includes polling functionality to check for new notifications periodically.
 * Allows users to mark individual notifications as read.
 */
export function NotificationsList() {
  const { data: notifications, isLoading, error } = useNotifications();
  const markAsRead = useMarkNotificationAsRead();

  const handleMarkAsRead = (notificationId: string) => {
    markAsRead.mutate(notificationId);
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notificaciones</h2>
        </div>
        <p className="text-sm text-muted-foreground">Cargando notificaciones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notificaciones</h2>
        </div>
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Error al cargar las notificaciones. Por favor, inténtalo de nuevo.
        </div>
      </div>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          <h2 className="text-lg font-semibold">Notificaciones</h2>
        </div>
        <Card className="p-6">
          <p className="text-center text-sm text-muted-foreground">
            No tienes notificaciones nuevas.
          </p>
        </Card>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Bell className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Notificaciones</h2>
        {unreadCount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            {unreadCount}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {notifications.map((notification) => {
          const createdAt = new Date(notification.createdAt);
          const timeAgo = formatDistanceToNow(createdAt, { locale: es, addSuffix: true });

          return (
            <Card
              key={notification.id}
              className={notification.read ? 'bg-muted/30' : 'border-primary/20 bg-primary/5'}
            >
              <div className="flex items-start gap-3 p-4">
                <div className="mt-0.5">
                  {notification.read ? (
                    <Bell className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <BellDot className="h-4 w-4 text-primary" />
                  )}
                </div>

                <div className="flex-1 space-y-1">
                  <p className={`text-sm ${notification.read ? 'text-muted-foreground' : ''}`}>
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">{timeAgo}</p>
                </div>

                {!notification.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(notification.id)}
                    disabled={markAsRead.isPending}
                    aria-label="Marcar como leída"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
