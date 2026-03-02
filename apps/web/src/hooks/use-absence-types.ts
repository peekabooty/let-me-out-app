import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AbsenceType } from '@repo/types';

import {
  createAbsenceType,
  deactivateAbsenceType,
  listAbsenceTypes,
  updateAbsenceType,
  type CreateAbsenceTypePayload,
  type UpdateAbsenceTypePayload,
} from '../lib/api-client';
import { absenceTypesKeys } from '../lib/query-keys/absence-types.keys';

export function useAbsenceTypes(onlyActive = false) {
  const { data, isLoading, isError, error } = useQuery<AbsenceType[]>({
    queryKey: absenceTypesKeys.list(onlyActive),
    queryFn: () => listAbsenceTypes(onlyActive),
    staleTime: 30 * 1000,
  });

  return { absenceTypes: data ?? [], isLoading, isError, error };
}

export function useCreateAbsenceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAbsenceTypePayload) => createAbsenceType(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absenceTypesKeys.all });
    },
  });
}

export function useUpdateAbsenceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateAbsenceTypePayload }) =>
      updateAbsenceType(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: absenceTypesKeys.all });
      queryClient.invalidateQueries({ queryKey: absenceTypesKeys.detail(id) });
    },
  });
}

export function useDeactivateAbsenceType() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deactivateAbsenceType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: absenceTypesKeys.all });
    },
  });
}
