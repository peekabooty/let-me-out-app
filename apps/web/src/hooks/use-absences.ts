import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Absence } from '@repo/types';
import { ValidationDecision } from '@repo/types';

import {
  createAbsence,
  validateAbsence,
  reconsiderAbsence,
  discardAbsence,
  cancelAbsence,
  getAbsence,
  type CreateAbsencePayload,
} from '../lib/api-client';
import { absencesKeys } from '../lib/query-keys/absences.keys';

export function useAbsence(absenceId: string) {
  return useQuery({
    queryKey: absencesKeys.detail(absenceId),
    queryFn: () => getAbsence(absenceId),
    enabled: Boolean(absenceId),
  });
}

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

export interface UseValidateAbsenceParams {
  absenceId: string;
  decision: ValidationDecision;
}

export function useValidateAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ absenceId, decision }: UseValidateAbsenceParams) =>
      validateAbsence(absenceId, decision),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: absencesKeys.list() });
      queryClient.invalidateQueries({ queryKey: absencesKeys.detail(variables.absenceId) });
    },
  });
}

export function useReconsiderAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (absenceId: string) => reconsiderAbsence(absenceId),
    onSuccess: (_data, absenceId) => {
      queryClient.invalidateQueries({ queryKey: absencesKeys.list() });
      queryClient.invalidateQueries({ queryKey: absencesKeys.detail(absenceId) });
    },
  });
}

export function useDiscardAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (absenceId: string) => discardAbsence(absenceId),
    onSuccess: (_data, absenceId) => {
      queryClient.invalidateQueries({ queryKey: absencesKeys.list() });
      queryClient.invalidateQueries({ queryKey: absencesKeys.detail(absenceId) });
    },
  });
}

export function useCancelAbsence() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (absenceId: string) => cancelAbsence(absenceId),
    onSuccess: (_data, absenceId) => {
      queryClient.invalidateQueries({ queryKey: absencesKeys.list() });
      queryClient.invalidateQueries({ queryKey: absencesKeys.detail(absenceId) });
    },
  });
}
