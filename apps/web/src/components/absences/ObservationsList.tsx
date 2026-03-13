import { useState } from 'react';
import { isAxiosError } from 'axios';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useObservations, useCreateObservation } from '../../hooks/use-observations';
import { useAuthStore } from '../../store/auth.store';

interface ObservationsListProps {
  absenceId: string;
}

export function ObservationsList({ absenceId }: ObservationsListProps) {
  const user = useAuthStore((state) => state.user);
  const { data: observations, isLoading, error } = useObservations(absenceId);
  const createObservation = useCreateObservation();
  const [content, setContent] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!content.trim()) return;

    setSubmitError(null);
    try {
      await createObservation.mutateAsync({
        absenceId,
        content: content.trim(),
      });
      setContent('');
    } catch (error_) {
      const message = isAxiosError(error_)
        ? error_.response?.data?.message || 'Error al crear la observación. Inténtalo de nuevo.'
        : 'Error al crear la observación. Inténtalo de nuevo.';
      setSubmitError(message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Observaciones</h2>
        <p className="text-sm text-muted-foreground">Cargando observaciones…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Observaciones</h2>
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          Error al cargar las observaciones. Inténtalo de nuevo.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Observaciones</h2>

      {/* Lista de observaciones */}
      {observations && observations.length > 0 ? (
        <div className="space-y-3">
          {observations.map((observation) => {
            const isOwnObservation = user?.id === observation.userId;
            const createdAt = new Date(observation.createdAt);

            return (
              <Card key={observation.id} className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {isOwnObservation ? 'Tú' : `Usuario ${observation.userId}`}
                    </span>
                    <time
                      dateTime={observation.createdAt}
                      className="text-xs text-muted-foreground"
                    >
                      {format(createdAt, "d 'de' MMMM 'de' yyyy 'a las' HH:mm", { locale: es })}
                    </time>
                  </div>
                  <p className="whitespace-pre-wrap text-sm">{observation.content}</p>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">No hay observaciones todavía.</p>
      )}

      {/* Formulario para nueva observación */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label htmlFor="observation-content" className="sr-only">
            Nueva observación
          </label>
          <Textarea
            id="observation-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Escribe una observación…"
            rows={3}
            disabled={createObservation.isPending}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={!content.trim() || createObservation.isPending}>
            {createObservation.isPending ? 'Enviando…' : 'Añadir observación'}
          </Button>
          {content.trim() && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setContent('')}
              disabled={createObservation.isPending}
            >
              Cancelar
            </Button>
          )}
        </div>
        {submitError && (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {submitError}
          </div>
        )}
      </form>
    </div>
  );
}
