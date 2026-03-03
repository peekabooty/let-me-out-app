import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { listObservations, createObservation } from '../lib/api-client';
import { observationsKeys } from '../lib/query-keys/observations.keys';

export function useObservations(absenceId: string) {
  return useQuery({
    queryKey: observationsKeys.list(absenceId),
    queryFn: () => listObservations(absenceId),
  });
}

export interface UseCreateObservationParams {
  absenceId: string;
  content: string;
}

export function useCreateObservation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ absenceId, content }: UseCreateObservationParams) =>
      createObservation(absenceId, { content }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: observationsKeys.list(variables.absenceId),
      });
    },
  });
}
