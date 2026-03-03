/**
 * Query keys for notifications.
 */
export const notificationsKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationsKeys.all, 'list'] as const,
  list: () => [...notificationsKeys.lists()] as const,
};
