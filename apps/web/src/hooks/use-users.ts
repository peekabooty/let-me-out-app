import { useQuery } from '@tanstack/react-query';

import type { User } from '@repo/types';
import { listUsers } from '../lib/api-client';
import { userKeys } from '../lib/query-keys/users.keys';

export function useUsers() {
  return useQuery<User[]>({
    queryKey: userKeys.list(),
    queryFn: listUsers,
    staleTime: 30 * 1000,
  });
}
