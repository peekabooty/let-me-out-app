export const observationsKeys = {
  all: ['observations'] as const,
  list: (absenceId: string) => [...observationsKeys.all, 'list', absenceId] as const,
};
