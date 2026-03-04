export interface AuditFilters {
  teamId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

export const auditKeys = {
  all: ['audit'] as const,
  absences: (filters?: AuditFilters) => [...auditKeys.all, 'absences', filters] as const,
};
