import { useState } from 'react';
import { isAxiosError } from 'axios';

import { AbsenceStatus } from '@repo/types';
import type { Absence } from '@repo/types';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../../store/auth.store';
import { useReconsiderAbsence, useDiscardAbsence } from '../../hooks/use-absences';

interface AbsenceReconsiderActionsProps {
  absence: Absence;
  onSuccess?: () => void;
}

export function AbsenceReconsiderActions({ absence, onSuccess }: AbsenceReconsiderActionsProps) {
  const user = useAuthStore((state) => state.user);
  const reconsiderAbsence = useReconsiderAbsence();
  const discardAbsence = useDiscardAbsence();
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const canReconsider = absence.status === AbsenceStatus.RECONSIDER && absence.userId === user.id;

  if (!canReconsider) {
    return null;
  }

  const handleReconsider = async () => {
    setError(null);
    try {
      await reconsiderAbsence.mutateAsync(absence.id);
      onSuccess?.();
    } catch (error_) {
      const message = isAxiosError(error_)
        ? error_.response?.data?.message || 'Error al reenviar la ausencia. Inténtalo de nuevo.'
        : 'Error al reenviar la ausencia. Inténtalo de nuevo.';
      setError(message);
    }
  };

  const handleDiscard = async () => {
    setError(null);
    try {
      await discardAbsence.mutateAsync(absence.id);
      onSuccess?.();
    } catch (error_) {
      const message = isAxiosError(error_)
        ? error_.response?.data?.message || 'Error al descartar la ausencia. Inténtalo de nuevo.'
        : 'Error al descartar la ausencia. Inténtalo de nuevo.';
      setError(message);
    }
  };

  const isPending = reconsiderAbsence.isPending || discardAbsence.isPending;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button onClick={handleReconsider} disabled={isPending} variant="default">
          {reconsiderAbsence.isPending ? 'Procesando…' : 'Reenviar'}
        </Button>
        <Button onClick={handleDiscard} disabled={isPending} variant="destructive">
          {discardAbsence.isPending ? 'Procesando…' : 'Descartar'}
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}
    </div>
  );
}
