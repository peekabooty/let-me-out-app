import { Theme } from '@repo/types';

export const THEME_STORAGE_KEY = 'theme';

export type ThemeDefinition = {
  value: Theme;
  label: string;
  preview: [string, string, string];
  colorScheme: 'light' | 'dark';
};

export const THEME_DEFINITIONS: ThemeDefinition[] = [
  {
    value: Theme.LIGHT,
    label: 'Claro',
    preview: ['#ffdab9', '#e6e6fa', '#f4c2c2'],
    colorScheme: 'light',
  },
  {
    value: Theme.DARK,
    label: 'Oscuro',
    preview: ['#ff9966', '#9b87f5', '#ff6b9d'],
    colorScheme: 'dark',
  },
  {
    value: Theme.CARAMEL,
    label: 'Caramelo',
    preview: ['#ffcc99', '#ffd9b3', '#ffb380'],
    colorScheme: 'light',
  },
  {
    value: Theme.CHOCOLATE,
    label: 'Chocolate',
    preview: ['#8b4513', '#a0522d', '#cd853f'],
    colorScheme: 'dark',
  },
];

export function isTheme(value: string): value is Theme {
  return Object.values(Theme).includes(value as Theme);
}

export function getColorScheme(theme: Theme): 'light' | 'dark' {
  const definition = THEME_DEFINITIONS.find((item) => item.value === theme);
  return definition?.colorScheme ?? 'light';
}

export function getThemeFromStorage(): Theme | null {
  if (globalThis.window === undefined) {
    return null;
  }

  const value = globalThis.localStorage.getItem(THEME_STORAGE_KEY);
  if (!value) {
    return null;
  }

  return isTheme(value) ? value : null;
}
