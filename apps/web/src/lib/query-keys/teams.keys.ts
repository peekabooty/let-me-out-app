export const teamsKeys = {
  all: ['teams'] as const,
  list: () => [...teamsKeys.all, 'list'] as const,
  detail: (id: string) => [...teamsKeys.all, 'detail', id] as const,
  members: (id: string) => [...teamsKeys.detail(id), 'members'] as const,
};
