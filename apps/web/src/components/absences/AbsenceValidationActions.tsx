import { useState } from 'react';
import { isAxiosError } from 'axios';

import { AbsenceStatus, ValidationDecision, UserRole } from '@repo/types';
import type { Absence } from '@repo/types';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '../../store/auth.store';
import { useValidateAbsence } from '../../hooks/use-absences';

interface AbsenceValidationActionsProps {
  absence: Absence;
  validatorIds: string[];
  onSuccess?: () => void;
}

export function AbsenceValidationActions({
  absence,
  validatorIds,
  onSuccess,
}: AbsenceValidationActionsProps) {
  const user = useAuthStore((state) => state.user);
  const validateAbsence = useValidateAbsence();
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return null;
  }

  const canValidate =
    (user.role === UserRole.VALIDATOR || user.role === UserRole.ADMIN) &&
    absence.status === AbsenceStatus.WAITING_VALIDATION &&
    validatorIds.includes(user.id) &&
    absence.userId !== user.id;

  if (!canValidate) {
    return null;
  }

  const handleValidation = async (decision: ValidationDecision) => {
    setError(null);
    try {
      await validateAbsence.mutateAsync({
        absenceId: absence.id,
        decision,
      });
      onSuccess?.();
    } catch (error_) {
      const message = isAxiosError(error_)
        ? error_.response?.data?.message || 'Error al procesar la validación. Inténtalo de nuevo.'
        : 'Error al procesar la validación. Inténtalo de nuevo.';
      setError(message);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button
          onClick={() => handleValidation(ValidationDecision.ACCEPTED)}
          disabled={validateAbsence.isPending}
          variant="default"
        >
          {validateAbsence.isPending ? 'Procesando…' : 'Aceptar'}
        </Button>
        <Button
          onClick={() => handleValidation(ValidationDecision.REJECTED)}
          disabled={validateAbsence.isPending}
          variant="destructive"
        >
          {validateAbsence.isPending ? 'Procesando…' : 'Rechazar'}
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
