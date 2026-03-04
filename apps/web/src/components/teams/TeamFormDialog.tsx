import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateTeam } from '../../hooks/use-teams';

const TeamSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'El color debe tener formato hexadecimal, por ejemplo #1A2B3C'),
});

type TeamFormValues = z.infer<typeof TeamSchema>;

interface TeamFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function getContrastTextColor(hexColor: string): string {
  const color = hexColor.replace('#', '');
  const red = Number.parseInt(color.slice(0, 2), 16);
  const green = Number.parseInt(color.slice(2, 4), 16);
  const blue = Number.parseInt(color.slice(4, 6), 16);

  const luminance = (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;

  return luminance > 0.55 ? '#111827' : '#F9FAFB';
}

export function TeamFormDialog({ open, onOpenChange, onSuccess }: TeamFormDialogProps) {
  const createTeam = useCreateTeam();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
    setError,
  } = useForm<TeamFormValues>({
    resolver: zodResolver(TeamSchema),
    defaultValues: {
      name: '',
      color: '#1D4ED8',
    },
  });

  const color = watch('color') || '#1D4ED8';
  const contrastTextColor = useMemo(() => getContrastTextColor(color), [color]);

  const onSubmit = async (values: TeamFormValues) => {
    try {
      await createTeam.mutateAsync(values);
      onSuccess();
      reset();
      onOpenChange(false);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 400
          ? 'No se pudo crear el equipo con los datos enviados.'
          : 'Error al crear el equipo. Inténtalo de nuevo.';
      setError('root', { message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo equipo</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="team-name">Nombre</Label>
            <Input
              id="team-name"
              type="text"
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? 'team-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="team-name-error" role="alert" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="team-color">Color (HEX)</Label>
            <div className="flex items-center gap-3">
              <Input
                id="team-color"
                type="text"
                aria-invalid={errors.color ? 'true' : undefined}
                aria-describedby={errors.color ? 'team-color-error' : undefined}
                {...register('color')}
              />
              <div
                className="h-10 min-w-24 rounded-md border border-border px-2 text-xs font-semibold"
                style={{
                  backgroundColor: color,
                  color: contrastTextColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                Vista previa
              </div>
            </div>
            {errors.color && (
              <p id="team-color-error" role="alert" className="text-sm text-destructive">
                {errors.color.message}
              </p>
            )}
          </div>

          {errors.root && (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              {errors.root.message}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createTeam.isPending}>
              {createTeam.isPending ? 'Creando…' : 'Crear equipo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
