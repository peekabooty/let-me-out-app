import { useQuery } from '@tanstack/react-query';

import { listAuditAbsences, type AuditAbsence, type AuditFilters } from '../lib/api-client';
import { auditKeys } from '../lib/query-keys/audit.keys';

export function useAuditAbsences(filters?: AuditFilters) {
  const { data, isLoading, isError, error } = useQuery<AuditAbsence[]>({
    queryKey: auditKeys.absences(filters),
    queryFn: () => listAuditAbsences(filters),
    staleTime: 30 * 1000,
  });

  return { absences: data ?? [], isLoading, isError, error };
}
