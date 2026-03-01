import { useQuery } from '@tanstack/react-query';
import type { User } from '@repo/types';

import { listUsers } from '../lib/api-client';
import { usersKeys } from '../lib/query-keys/users.keys';

export function useUsers() {
  const { data, isLoading, isError, error } = useQuery<User[]>({
    queryKey: usersKeys.list(),
    queryFn: listUsers,
    staleTime: 30 * 1000,
  });

  return { users: data ?? [], isLoading, isError, error };
}
