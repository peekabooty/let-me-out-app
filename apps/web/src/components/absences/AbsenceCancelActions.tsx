import { useState } from 'react';
import { isAxiosError } from 'axios';

import { AbsenceStatus } from '@repo/types';
import type { Absence } from '@repo/types';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../../store/auth.store';
import { useCancelAbsence } from '../../hooks/use-absences';

interface AbsenceCancelActionsProps {
  absence: Absence;
  onSuccess?: () => void;
}

export function AbsenceCancelActions({ absence, onSuccess }: AbsenceCancelActionsProps) {
  const user = useAuthStore((state) => state.user);
  const cancelAbsence = useCancelAbsence();
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  // RF-51: Only the creator can cancel an ACCEPTED absence before its start date
  const now = new Date();
  const startDate = new Date(absence.startAt);
  const canCancel =
    absence.status === AbsenceStatus.ACCEPTED && absence.userId === user.id && startDate > now;

  if (!canCancel) {
    return null;
  }

  const handleCancel = async () => {
    setError(null);
    try {
      await cancelAbsence.mutateAsync(absence.id);
      onSuccess?.();
    } catch (error_) {
      const message = isAxiosError(error_)
        ? error_.response?.data?.message || 'Error al cancelar la ausencia. Inténtalo de nuevo.'
        : 'Error al cancelar la ausencia. Inténtalo de nuevo.';
      setError(message);
    }
  };

  return (
    <div className="space-y-2">
      <Button onClick={handleCancel} disabled={cancelAbsence.isPending} variant="destructive">
        {cancelAbsence.isPending ? 'Procesando…' : 'Cancelar ausencia'}
      </Button>
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
