export const calendarKeys = {
  all: ['calendar'] as const,
  absences: () => [...calendarKeys.all, 'absences'] as const,
};
