import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Absence } from '@repo/types';

import { createAbsence, type CreateAbsencePayload } from '../lib/api-client';
import { absencesKeys } from '../lib/query-keys/absences.keys';

export function useCreateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAbsencePayload) => createAbsence(payload),
    onSuccess: (newAbsence: Absence) => {
      queryClient.invalidateQueries({ queryKey: absencesKeys.list() });
      queryClient.invalidateQueries({ queryKey: absencesKeys.detail(newAbsence.id) });
    },
  });
}
