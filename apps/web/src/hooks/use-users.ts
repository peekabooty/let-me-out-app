import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Theme, User } from '@repo/types';

import {
  createUser,
  listUsers,
  updateMyTheme,
  updateUser,
  type CreateUserPayload,
  type UpdateUserPayload,
} from '../lib/api-client';
import { usersKeys } from '../lib/query-keys/users.keys';

export function useUsers() {
  const { data, isLoading, isError, error } = useQuery<User[]>({
    queryKey: usersKeys.list(),
    queryFn: listUsers,
    staleTime: 30 * 1000,
  });

  return { users: data ?? [], isLoading, isError, error };
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateUserPayload }) =>
      updateUser(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: usersKeys.list() });
      queryClient.invalidateQueries({ queryKey: usersKeys.detail(id) });
    },
  });
}

export function useUpdateTheme() {
  return useMutation({
    mutationFn: (theme: Theme) => updateMyTheme({ theme }),
  });
}
