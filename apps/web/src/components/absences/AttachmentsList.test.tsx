import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import type { Attachment } from '@repo/types';
import { AttachmentsList } from './AttachmentsList';

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const mockAttachments: Attachment[] = [
  {
    id: '01900000-0000-7000-8000-000000000001',
    observationId: '01900000-0000-7000-8000-000000000100',
    filename: 'documento.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024 * 500, // 500 KB
    createdAt: '2026-03-01T10:00:00.000Z',
  },
  {
    id: '01900000-0000-7000-8000-000000000002',
    observationId: '01900000-0000-7000-8000-000000000100',
    filename: 'imagen.jpg',
    mimeType: 'image/jpeg',
    sizeBytes: 1024 * 1024 * 2.5, // 2.5 MB
    createdAt: '2026-03-02T11:30:00.000Z',
  },
];

function renderComponent(observationId = '01900000-0000-7000-8000-000000000100') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <AttachmentsList observationId={observationId} />
    </QueryClientProvider>
  );
}

describe('AttachmentsList', () => {
  it('muestra estado de carga inicialmente', () => {
    server.use(
      http.get('*/observations/:observationId/attachments', async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json([]);
      })
    );

    renderComponent();

    expect(screen.getByText('Cargando adjuntos…')).toBeInTheDocument();
  });

  it('no renderiza nada cuando no hay adjuntos', async () => {
    server.use(http.get('*/observations/:observationId/attachments', () => HttpResponse.json([])));

    const { container } = renderComponent();

    await waitFor(() => {
      expect(container).toBeEmptyDOMElement();
    });
  });

  it('muestra lista de adjuntos existentes', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json(mockAttachments)
      )
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('documento.pdf')).toBeInTheDocument();
      expect(screen.getByText('imagen.jpg')).toBeInTheDocument();
    });
  });

  it('muestra el conteo de adjuntos', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json(mockAttachments)
      )
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('Adjuntos (2)')).toBeInTheDocument();
    });
  });

  it('formatea correctamente el tamaño de archivos en KB', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json(mockAttachments)
      )
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('500.0 KB')).toBeInTheDocument();
    });
  });

  it('formatea correctamente el tamaño de archivos en MB', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json(mockAttachments)
      )
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('2.5 MB')).toBeInTheDocument();
    });
  });

  it('muestra icono de archivo para PDFs', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json([mockAttachments[0]])
      )
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByText('documento.pdf')).toBeInTheDocument();
      // Verify FileText icon is rendered (lucide-file-text class)
      const container = screen.getByText('documento.pdf').closest('.space-y-2');
      expect(container?.querySelector('.lucide-file-text')).toBeInTheDocument();
    });
  });

  it('muestra vista previa para imágenes con loading lazy', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json([mockAttachments[1]])
      )
    );

    renderComponent();

    await waitFor(() => {
      const images = screen.getAllByAltText('imagen.jpg');
      expect(images.length).toBeGreaterThan(0);
      for (const img of images) {
        expect(img).toHaveAttribute('loading', 'lazy');
      }
    });
  });

  it('incluye enlace de descarga para cada adjunto', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json(mockAttachments)
      )
    );

    renderComponent();

    await waitFor(() => {
      const downloadLinks = screen.getAllByRole('link');
      expect(downloadLinks).toHaveLength(2);
      for (const link of downloadLinks) {
        expect(link).toHaveAttribute('href');
        expect(link.getAttribute('href')).toContain('/download');
      }
    });
  });

  it('incluye aria-label en botones de descarga', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json([mockAttachments[0]])
      )
    );

    renderComponent();

    await waitFor(() => {
      const downloadButton = screen.getByLabelText('Descargar documento.pdf');
      expect(downloadButton).toBeInTheDocument();
    });
  });

  it('muestra mensaje de error cuando falla la carga', async () => {
    server.use(
      http.get('*/observations/:observationId/attachments', () =>
        HttpResponse.json({ message: 'Error de servidor' }, { status: 500 })
      )
    );

    renderComponent();

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toHaveTextContent('Error al cargar los adjuntos');
    });
  });
});
