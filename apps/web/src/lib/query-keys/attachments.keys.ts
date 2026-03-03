/**
 * Query key factory for attachments.
 *
 * Follows the hierarchical structure recommended in TanStack Query docs.
 */
export const attachmentsKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentsKeys.all, 'list'] as const,
  list: (observationId: string) => [...attachmentsKeys.lists(), observationId] as const,
};
