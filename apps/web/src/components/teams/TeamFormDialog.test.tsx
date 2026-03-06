import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { TeamFormDialog } from './TeamFormDialog';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(open = true, onSuccess = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TeamFormDialog open={open} onOpenChange={vi.fn()} onSuccess={onSuccess} />
    </QueryClientProvider>
  );

  return { onSuccess };
}

describe('TeamFormDialog', () => {
  it('renders form fields and preview', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Nuevo equipo' })).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument();
    expect(screen.getByLabelText('Selector de color')).toBeInTheDocument();
    expect(screen.getByLabelText('Color (HEX)')).toBeInTheDocument();
    expect(screen.getByText('Vista previa')).toBeInTheDocument();
  });

  it('shows validation errors for invalid values', async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.type(screen.getByLabelText('Nombre'), 'A');
    const hexInput = screen.getByLabelText('Color (HEX)');
    await user.clear(hexInput);
    await user.type(hexInput, '#12');
    await user.click(screen.getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => {
      expect(screen.getByText('El nombre debe tener al menos 2 caracteres')).toBeInTheDocument();
    });

    expect(
      screen.getByText('El color debe tener formato hexadecimal, por ejemplo #1A2B3C')
    ).toBeInTheDocument();
  });

  it('submits valid data and calls onSuccess', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    let requestBody: unknown;

    server.use(
      http.post('*/teams', async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({ id: '01930000-0000-7000-8000-000000000500' }, { status: 201 });
      })
    );

    renderDialog(true, onSuccess);

    await user.type(screen.getByLabelText('Nombre'), 'Plataforma');
    const hexInput = screen.getByLabelText('Color (HEX)');
    await user.clear(hexInput);
    await user.type(hexInput, '#0EA5E9');
    await user.click(screen.getByRole('button', { name: 'Crear equipo' }));

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });

    expect(requestBody).toEqual({ name: 'Plataforma', color: '#0EA5E9' });
  });

  it('shows contrast warning for a low-contrast color', async () => {
    const user = userEvent.setup();
    renderDialog();

    const hexInput = screen.getByLabelText('Color (HEX)');
    await user.clear(hexInput);
    await user.type(hexInput, '#FFFF00');

    await waitFor(() => {
      expect(screen.getByText(/no supera el contraste mínimo WCAG AA/i)).toBeInTheDocument();
    });
  });

  it('does not show contrast warning for a high-contrast color', async () => {
    renderDialog();

    expect(screen.queryByText(/no supera el contraste mínimo WCAG AA/i)).not.toBeInTheDocument();
  });

  it('color picker input has type color', () => {
    renderDialog();

    const picker = screen.getByLabelText('Selector de color');
    expect(picker).toHaveAttribute('type', 'color');
  });
});
