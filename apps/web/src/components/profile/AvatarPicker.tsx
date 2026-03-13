import { useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { updateMyAvatar } from '../../lib/api-client';
import { sessionKeys } from '../../lib/query-keys/session.keys';

const STOCK_AVATARS = [
  '/avatars/avatar-1.png',
  '/avatars/avatar-2.png',
  '/avatars/avatar-3.png',
  '/avatars/avatar-4.png',
  '/avatars/avatar-5.png',
  '/avatars/avatar-6.png',
] as const;

interface AvatarPickerProps {
  onCompleted?: () => void;
  onSkip?: () => void;
}

async function buildFileFromStockAvatar(url: string): Promise<File> {
  const response = await fetch(url);
  const blob = await response.blob();
  const filename = url.split('/').pop() ?? 'avatar.png';
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

export function AvatarPicker({ onCompleted, onSkip }: AvatarPickerProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedStockAvatar, setSelectedStockAvatar] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setIsSubmitting(true);

    try {
      await updateMyAvatar(file);
      await queryClient.invalidateQueries({ queryKey: sessionKeys.me() });
      onCompleted?.();
    } catch {
      setUploadError('No se pudo actualizar el avatar. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Elige un avatar o sube tu propia imagen (JPEG/PNG).
      </p>

      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Avatares disponibles">
        {STOCK_AVATARS.map((avatarUrl) => {
          const isSelected = selectedStockAvatar === avatarUrl;

          return (
            <button
              key={avatarUrl}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Seleccionar ${avatarUrl.split('/').pop()}`}
              onClick={() => setSelectedStockAvatar(avatarUrl)}
              className={`overflow-hidden rounded-md border ${isSelected ? 'border-primary' : 'border-border'}`}
            >
              <img src={avatarUrl} alt="" className="h-20 w-full object-cover" />
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={isSubmitting}
        >
          Subir foto
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void handleUpload(file);
            }
            event.currentTarget.value = '';
          }}
        />

        <Button
          type="button"
          onClick={async () => {
            if (!selectedStockAvatar) {
              return;
            }

            const file = await buildFileFromStockAvatar(selectedStockAvatar);
            await handleUpload(file);
          }}
          disabled={!selectedStockAvatar || isSubmitting}
        >
          Confirmar
        </Button>

        {onSkip && (
          <Button type="button" variant="ghost" onClick={onSkip} disabled={isSubmitting}>
            Omitir
          </Button>
        )}
      </div>

      {uploadError && (
        <p role="alert" className="text-sm text-destructive">
          {uploadError}
        </p>
      )}
    </div>
  );
}
