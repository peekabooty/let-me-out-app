export const absencesKeys = {
  all: ['absences'] as const,
  list: () => [...absencesKeys.all, 'list'] as const,
  detail: (id: string) => [...absencesKeys.all, 'detail', id] as const,
};
