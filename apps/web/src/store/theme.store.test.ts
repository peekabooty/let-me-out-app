import { Theme } from '@repo/types';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { THEME_STORAGE_KEY } from '../themes/theme-definitions';
import { useThemeStore } from './theme.store';

afterEach(() => {
  globalThis.localStorage.clear();
  delete globalThis.document.documentElement.dataset.theme;
  globalThis.document.documentElement.style.colorScheme = '';
  useThemeStore.setState({ currentTheme: Theme.LIGHT });
});

describe('useThemeStore', () => {
  it('setTheme applies DOM attributes and writes localStorage', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme(Theme.CHOCOLATE);
    });

    expect(result.current.currentTheme).toBe(Theme.CHOCOLATE);
    expect(globalThis.document.documentElement.dataset.theme).toBe(Theme.CHOCOLATE);
    expect(globalThis.document.documentElement.style.colorScheme).toBe('dark');
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBe(Theme.CHOCOLATE);
  });

  it('initTheme applies theme without writing localStorage', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.initTheme(Theme.CARAMEL);
    });

    expect(result.current.currentTheme).toBe(Theme.CARAMEL);
    expect(globalThis.document.documentElement.dataset.theme).toBe(Theme.CARAMEL);
    expect(globalThis.document.documentElement.style.colorScheme).toBe('light');
    expect(globalThis.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });
});
