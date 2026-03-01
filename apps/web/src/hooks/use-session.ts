import { useQuery } from '@tanstack/react-query';

import { fetchMe } from '../lib/api-client';
import { sessionKeys } from '../lib/query-keys/session.keys';
import { useAuthStore } from '../store/auth.store';
import type { SessionUser } from '../store/auth.store';

export function useSession() {
  const setUser = useAuthStore((s) => s.setUser);

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<SessionUser>({
    queryKey: sessionKeys.me(),
    queryFn: async () => {
      const me = await fetchMe();
      setUser(me);
      return me;
    },
    retry: false,
    staleTime: 60 * 1000,
  });

  return { user: user ?? null, isLoading, isError };
}
