import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Notification } from '@repo/types';

import { listNotifications, markNotificationAsRead } from '../lib/api-client';
import { notificationsKeys } from '../lib/query-keys/notifications.keys';

/**
 * Hook to list notifications with polling.
 *
 * Polls every 30 seconds to check for new notifications.
 * Data is considered stale after 25 seconds to trigger background refetch.
 */
export function useNotifications() {
  return useQuery<Notification[], Error>({
    queryKey: notificationsKeys.list(),
    queryFn: listNotifications,
    staleTime: 25_000, // 25 seconds
    refetchInterval: 30_000, // 30 seconds
    refetchIntervalInBackground: false,
  });
}

/**
 * Hook to mark a notification as read.
 *
 * Optimistically updates the UI and refetches notifications on success.
 */
export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => markNotificationAsRead(notificationId),
    onMutate: async (notificationId: string) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationsKeys.list() });

      // Snapshot the previous value
      const previousNotifications = queryClient.getQueryData<Notification[]>(
        notificationsKeys.list()
      );

      // Optimistically update to mark as read
      if (previousNotifications) {
        queryClient.setQueryData<Notification[]>(
          notificationsKeys.list(),
          previousNotifications.map((notification) =>
            notification.id === notificationId ? { ...notification, read: true } : notification
          )
        );
      }

      return { previousNotifications };
    },
    onError: (_error, _notificationId, context) => {
      // Rollback to previous value on error
      if (context?.previousNotifications) {
        queryClient.setQueryData(notificationsKeys.list(), context.previousNotifications);
      }
    },
    onSettled: () => {
      // Always refetch after error or success
      void queryClient.invalidateQueries({ queryKey: notificationsKeys.list() });
    },
  });
}
