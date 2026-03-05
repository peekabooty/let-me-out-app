import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { TeamMembersDialog } from './TeamMembersDialog';

const TEAM_ID = '01930000-0000-7000-8000-000000000301';

const members = [
  {
    userId: '01930000-0000-7000-8000-000000000001',
    userName: 'Alice',
    userEmail: 'alice@example.com',
    joinedAt: '2024-01-01T00:00:00.000Z',
  },
];

const users = [
  {
    id: '01930000-0000-7000-8000-000000000001',
    name: 'Alice',
    email: 'alice@example.com',
    role: 'STANDARD',
    isActive: true,
  },
  {
    id: '01930000-0000-7000-8000-000000000002',
    name: 'Bob',
    email: 'bob@example.com',
    role: 'VALIDATOR',
    isActive: true,
  },
  {
    id: '01930000-0000-7000-8000-000000000003',
    name: 'Carol',
    email: 'carol@example.com',
    role: 'AUDITOR',
    isActive: true,
  },
];

const server = setupServer(
  http.get('*/teams/:teamId/members', () => HttpResponse.json(members)),
  http.get('*/users', () => HttpResponse.json(users))
);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderDialog(props: { readOnly?: boolean } = {}) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  render(
    <QueryClientProvider client={queryClient}>
      <TeamMembersDialog
        open={true}
        onOpenChange={vi.fn()}
        teamId={TEAM_ID}
        teamName="Plataforma"
        {...(props.readOnly === undefined ? {} : { readOnly: props.readOnly })}
      />
    </QueryClientProvider>
  );
}

describe('TeamMembersDialog', () => {
  it('renders dialog title', async () => {
    renderDialog();
    expect(
      await screen.findByRole('heading', { name: 'Miembros de Plataforma' })
    ).toBeInTheDocument();
  });

  it('renders existing members', async () => {
    renderDialog();
    expect(await screen.findByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
  });

  it('shows empty state when no members', async () => {
    server.use(http.get('*/teams/:teamId/members', () => HttpResponse.json([])));
    renderDialog();
    expect(await screen.findByText('Este equipo no tiene miembros todavía.')).toBeInTheDocument();
  });

  it('shows add member section in editable mode', async () => {
    renderDialog();
    await screen.findByText('Alice'); // wait for load
    expect(screen.getByText('Añadir miembro')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Añadir' })).toBeInTheDocument();
  });

  it('hides add member section in readOnly mode', async () => {
    renderDialog({ readOnly: true });
    await screen.findByText('Alice'); // wait for load
    expect(screen.queryByText('Añadir miembro')).not.toBeInTheDocument();
  });

  it('hides remove buttons in readOnly mode', async () => {
    renderDialog({ readOnly: true });
    await screen.findByText('Alice');
    expect(screen.queryByRole('button', { name: 'Eliminar' })).not.toBeInTheDocument();
  });

  it('filters out auditors from the candidate list', async () => {
    renderDialog();
    await screen.findByText('Añadir miembro');
    const select = screen.getByRole('combobox', { name: 'Seleccionar usuario' });
    expect(select).not.toHaveTextContent('Carol');
  });

  it('filters out already-members from the candidate list', async () => {
    renderDialog();
    await screen.findByText('Añadir miembro');
    const options = screen.getAllByRole('option');
    const optionTexts = options.map((o) => o.textContent);
    expect(optionTexts).not.toContain('Alice (alice@example.com)');
  });

  it('calls POST /teams/:id/members when adding a member', async () => {
    const user = userEvent.setup();
    let requestBody: unknown;

    server.use(
      http.post(`*/teams/${TEAM_ID}/members`, async ({ request }) => {
        requestBody = await request.json();
        return HttpResponse.json({}, { status: 201 });
      })
    );

    renderDialog();

    // Wait for the user option to appear in the dropdown
    const select = await screen.findByRole('combobox', { name: 'Seleccionar usuario' });
    await waitFor(() => {
      expect(select.querySelectorAll('option').length).toBeGreaterThan(1);
    });

    await user.selectOptions(select, '01930000-0000-7000-8000-000000000002');
    await user.click(screen.getByRole('button', { name: 'Añadir' }));

    await waitFor(() => {
      expect(requestBody).toEqual({ userId: '01930000-0000-7000-8000-000000000002' });
    });
  });

  it('calls DELETE when removing a member', async () => {
    const user = userEvent.setup();
    let deletedUrl = '';

    server.use(
      http.delete(`*/teams/${TEAM_ID}/members/:userId`, ({ request }) => {
        deletedUrl = request.url;
        return new HttpResponse(null, { status: 204 });
      })
    );

    renderDialog();
    await screen.findByText('Alice');

    await user.click(screen.getByRole('button', { name: 'Eliminar' }));

    await waitFor(() => {
      expect(deletedUrl).toContain('01930000-0000-7000-8000-000000000001');
    });
  });
});
