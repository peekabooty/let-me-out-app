import { Theme } from '@repo/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useThemeStore } from '../../store/theme.store';
import { ThemeSelector } from './ThemeSelector';

const updateMyThemeMock = vi.hoisted(() => vi.fn<[{ theme: Theme }], Promise<void>>());

vi.mock('../../lib/api-client', () => ({
  updateMyTheme: updateMyThemeMock,
}));

function renderSelector() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeSelector />
    </QueryClientProvider>
  );
}

afterEach(() => {
  updateMyThemeMock.mockReset();
  useThemeStore.setState({ currentTheme: Theme.LIGHT });
  globalThis.localStorage.clear();
});

describe('ThemeSelector', () => {
  it('renders four theme cards with radiogroup semantics', () => {
    renderSelector();

    expect(screen.getByRole('radiogroup', { name: 'Selector de tema' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Claro' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Oscuro' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Caramelo' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Chocolate' })).toBeInTheDocument();
  });

  it('marks the active theme using aria-checked', () => {
    useThemeStore.setState({ currentTheme: Theme.CARAMEL });
    renderSelector();

    expect(screen.getByRole('radio', { name: 'Caramelo' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Claro' })).toHaveAttribute('aria-checked', 'false');
  });

  it('applies theme and calls API on click', async () => {
    const user = userEvent.setup();
    updateMyThemeMock.mockResolvedValue();
    renderSelector();

    await user.click(screen.getByRole('radio', { name: 'Oscuro' }));

    await waitFor(() => {
      expect(updateMyThemeMock).toHaveBeenCalledWith({ theme: Theme.DARK });
      expect(useThemeStore.getState().currentTheme).toBe(Theme.DARK);
    });
  });

  it('supports Enter and Space keyboard selection', async () => {
    updateMyThemeMock.mockResolvedValue();
    renderSelector();

    const caramel = screen.getByRole('radio', { name: 'Caramelo' });

    caramel.focus();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => {
      expect(updateMyThemeMock).toHaveBeenCalledWith({ theme: Theme.CARAMEL });
    });

    const chocolate = screen.getByRole('radio', { name: 'Chocolate' });
    chocolate.focus();
    await userEvent.keyboard(' ');

    await waitFor(() => {
      expect(updateMyThemeMock).toHaveBeenCalledWith({ theme: Theme.CHOCOLATE });
    });
  });

  it('shows non-blocking error and restores previous theme when request fails', async () => {
    const user = userEvent.setup();
    useThemeStore.setState({ currentTheme: Theme.LIGHT });
    updateMyThemeMock.mockRejectedValue(new Error('network'));
    renderSelector();

    await user.click(screen.getByRole('radio', { name: 'Chocolate' }));

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'No se pudo guardar la preferencia de tema. Se restauró el tema anterior.'
      );
      expect(useThemeStore.getState().currentTheme).toBe(Theme.LIGHT);
    });
  });
});
