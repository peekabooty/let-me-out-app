import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Team } from '@repo/types';

import {
  addTeamMember,
  createTeam,
  deleteTeam,
  listTeamMembers,
  listTeams,
  removeTeamMember,
  type CreateTeamPayload,
  type TeamMemberDto,
} from '../lib/api-client';
import { teamsKeys } from '../lib/query-keys/teams.keys';

export type { TeamMemberDto } from '../lib/api-client';

export function useTeams() {
  const { data, isLoading, isError, error } = useQuery<Team[]>({
    queryKey: teamsKeys.list(),
    queryFn: listTeams,
    staleTime: 30 * 1000,
  });

  return { teams: data ?? [], isLoading, isError, error };
}

export function useTeamMembers(teamId: string) {
  const { data, isLoading, isError, error } = useQuery<TeamMemberDto[]>({
    queryKey: teamsKeys.members(teamId),
    queryFn: () => listTeamMembers(teamId),
    staleTime: 30 * 1000,
    enabled: teamId.length > 0,
  });

  return { members: data ?? [], isLoading, isError, error };
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

export function useDeleteTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (teamId: string) => deleteTeam(teamId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: teamsKeys.all });
    },
  });
}
