import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { Attachment } from '@repo/types';

import { listAttachments, uploadAttachment } from '../lib/api-client';
import { attachmentsKeys } from '../lib/query-keys/attachments.keys';

/**
 * Hook to fetch attachments for a given observation.
 *
 * @param {string} observationId - The observation ID
 * @returns Query result with attachments array
 */
export function useAttachments(observationId: string) {
  return useQuery<Attachment[]>({
    queryKey: attachmentsKeys.list(observationId),
    queryFn: () => listAttachments(observationId),
  });
}

/**
 * Hook to upload an attachment to an observation.
 *
 * @param {string} observationId - The observation ID
 * @returns Mutation object with upload function
 */
export function useUploadAttachment(observationId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => uploadAttachment(observationId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: attachmentsKeys.list(observationId),
      });
    },
  });
}
