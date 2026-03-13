import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { apiClient } from '../../lib/api-client';
import { AvatarPicker } from './AvatarPicker';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderPicker(props?: { onCompleted?: () => void; onSkip?: () => void }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <AvatarPicker {...props} />
    </QueryClientProvider>
  );
}

describe('AvatarPicker', () => {
  it('renders six stock avatars', () => {
    renderPicker();

    expect(screen.getByRole('radiogroup', { name: 'Avatares disponibles' })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(6);
  });

  it('uploads selected stock avatar on confirm', async () => {
    const user = userEvent.setup();
    const baseURL = apiClient.defaults.baseURL ?? 'http://localhost:3010';
    const onCompleted = vi.fn();

    server.use(
      http.get('*/avatars/avatar-1.png', () => new HttpResponse(new Uint8Array([1, 2, 3]))),
      http.patch(`${baseURL}/users/me/avatar`, () =>
        HttpResponse.json({ avatarUrl: '/users/1/avatar' })
      )
    );

    renderPicker({ onCompleted });

    await user.click(screen.getByRole('radio', { name: 'Seleccionar avatar-1.png' }));
    await user.click(screen.getByRole('button', { name: 'Confirmar' }));

    await waitFor(() => {
      expect(onCompleted).toHaveBeenCalled();
    });
  });

  it('calls onSkip when skip button is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    renderPicker({ onSkip });

    await user.click(screen.getByRole('button', { name: 'Omitir' }));

    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});
