import { create } from 'zustand';
import { Theme } from '@repo/types';

import { getColorScheme, THEME_STORAGE_KEY } from '../themes/theme-definitions';

function applyTheme(theme: Theme): void {
  if (globalThis.window === undefined) {
    return;
  }

  globalThis.document.documentElement.dataset.theme = theme;
  globalThis.document.documentElement.style.colorScheme = getColorScheme(theme);
}

interface ThemeState {
  currentTheme: Theme;
  setTheme: (theme: Theme) => void;
  initTheme: (theme: Theme) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  currentTheme: Theme.LIGHT,
  setTheme: (theme) => {
    applyTheme(theme);
    if (globalThis.window !== undefined) {
      globalThis.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
    set({ currentTheme: theme });
  },
  initTheme: (theme) => {
    applyTheme(theme);
    set({ currentTheme: theme });
  },
}));
