import { useQuery } from '@tanstack/react-query';

import { listCalendarAbsences } from '../lib/api-client';
import { calendarKeys } from '../lib/query-keys/calendar.keys';

/**
 * Custom hook to fetch calendar absences (own + team members).
 *
 * Returns all absences for the authenticated user and their team members,
 * with color information for rendering in the calendar.
 */
export function useCalendarAbsences() {
  return useQuery({
    queryKey: calendarKeys.absences(),
    queryFn: listCalendarAbsences,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
