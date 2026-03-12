import { useNavigate } from '@tanstack/react-router';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore, UserRole } from '../../store/auth.store';
import { LogoutButton } from './LogoutButton';

const logoutMock = vi.hoisted(() => vi.fn<[], Promise<void>>());
const navigateMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('../../lib/api-client', () => ({
  logout: logoutMock,
}));

afterEach(() => {
  logoutMock.mockReset();
  navigateMock.mockReset();
  useAuthStore.getState().clearSession();
});

describe('LogoutButton', () => {
  it('calls logout, clears session, and navigates to /login', async () => {
    const user = userEvent.setup();
    logoutMock.mockResolvedValue();
    vi.mocked(useNavigate).mockReturnValue(navigateMock);

    useAuthStore.setState({
      user: {
        id: '01900000-0000-7000-8000-000000000001',
        name: 'Test User',
        email: 'test@example.com',
        role: UserRole.STANDARD,
        isActive: true,
      },
      isLoading: false,
    });

    render(<LogoutButton />);

    await user.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

    await waitFor(() => {
      expect(logoutMock).toHaveBeenCalledTimes(1);
      expect(useAuthStore.getState().user).toBeNull();
      expect(navigateMock).toHaveBeenCalledWith({ to: '/login' });
    });
  });
});
