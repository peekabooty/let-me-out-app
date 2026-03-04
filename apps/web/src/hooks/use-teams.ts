import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Team } from '@repo/types';

import {
  addTeamMember,
  createTeam,
  listTeams,
  removeTeamMember,
  type CreateTeamPayload,
} from '../lib/api-client';
import { teamsKeys } from '../lib/query-keys/teams.keys';

export function useTeams() {
  const { data, isLoading, isError, error } = useQuery<Team[]>({
    queryKey: teamsKeys.list(),
    queryFn: listTeams,
    staleTime: 30 * 1000,
  });

  return { teams: data ?? [], isLoading, isError, error };
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTeamPayload) => createTeam(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamsKeys.all });
    },
  });
}

export function useAddTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      addTeamMember(teamId, { userId }),
    onSuccess: (_, { teamId }) => {
      void queryClient.invalidateQueries({ queryKey: teamsKeys.all });
      void queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) });
    },
  });
}

export function useRemoveTeamMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ teamId, userId }: { teamId: string; userId: string }) =>
      removeTeamMember(teamId, userId),
    onSuccess: (_, { teamId }) => {
      void queryClient.invalidateQueries({ queryKey: teamsKeys.all });
      void queryClient.invalidateQueries({ queryKey: teamsKeys.members(teamId) });
    },
  });
}
