import { useQuery } from '@tanstack/react-query';

import { fetchDashboard } from '../lib/api-client';
import { dashboardKeys } from '../lib/query-keys/dashboard.keys';

/**
 * Custom hook to fetch dashboard data (RF-55).
 *
 * Returns:
 * - Balance per absence type (maxPerYear, consumed, remaining)
 * - Upcoming absences (max 10, ordered by startAt ASC)
 * - Pending validations (only for validators)
 */
export function useDashboard() {
  return useQuery({
    queryKey: dashboardKeys.data(),
    queryFn: fetchDashboard,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
