export const absenceTypesKeys = {
  all: ['absence-types'] as const,
  list: (onlyActive?: boolean) => [...absenceTypesKeys.all, 'list', { onlyActive }] as const,
  detail: (id: string) => [...absenceTypesKeys.all, 'detail', id] as const,
};
