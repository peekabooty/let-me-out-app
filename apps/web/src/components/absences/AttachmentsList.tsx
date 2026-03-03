import { Download, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAttachments } from '../../hooks/use-attachments';
import { getAttachmentDownloadUrl } from '../../lib/api-client';

interface AttachmentsListProps {
  observationId: string;
}

/**
 * Formats file size in bytes to human-readable format.
 *
 * @param {number} bytes - File size in bytes
 * @returns {string} Formatted file size (e.g., "1.5 MB")
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Determines if a MIME type is an image.
 *
 * @param {string} mimeType - MIME type to check
 * @returns {boolean} True if the MIME type is an image
 */
function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Component that displays a list of attachments for an observation.
 * Supports image preview with lazy loading and file download.
 */
export function AttachmentsList({ observationId }: AttachmentsListProps) {
  const { data: attachments, isLoading, error } = useAttachments(observationId);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Adjuntos</h3>
        <p className="text-xs text-muted-foreground">Cargando adjuntos…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Adjuntos</h3>
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          Error al cargar los adjuntos.
        </div>
      </div>
    );
  }

  if (!attachments || attachments.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Adjuntos ({attachments.length})</h3>
      <div className="space-y-2">
        {attachments.map((attachment) => {
          const downloadUrl = getAttachmentDownloadUrl(attachment.id);
          const isImage = isImageMimeType(attachment.mimeType);
          const createdAt = new Date(attachment.createdAt);

          return (
            <Card key={attachment.id} className="p-3">
              <div className="flex items-start gap-3">
                {/* Icon or image preview */}
                <div className="flex-shrink-0">
                  {isImage ? (
                    <div className="h-12 w-12 overflow-hidden rounded border">
                      <img
                        src={downloadUrl}
                        alt={attachment.filename}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded border bg-muted">
                      <FileText className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* File info */}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate text-sm font-medium">{attachment.filename}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(attachment.sizeBytes)}</span>
                    <span>•</span>
                    <time dateTime={attachment.createdAt}>
                      {format(createdAt, "d 'de' MMM 'de' yyyy", { locale: es })}
                    </time>
                  </div>
                </div>

                {/* Download button */}
                <div className="flex-shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                    aria-label={`Descargar ${attachment.filename}`}
                  >
                    <a href={downloadUrl} download={attachment.filename}>
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>

              {/* Full image preview for images */}
              {isImage && (
                <div className="mt-3">
                  <img
                    src={downloadUrl}
                    alt={attachment.filename}
                    loading="lazy"
                    className="max-h-64 w-full rounded border object-contain"
                  />
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
