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

/** Converts an 8-bit sRGB channel value to linear light. */
function toLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Returns relative luminance of a hex color per WCAG 2.x formula. */
function getRelativeLuminance(hex: string): number {
  const color = hex.replace('#', '');
  const r = toLinear(Number.parseInt(color.slice(0, 2), 16));
  const g = toLinear(Number.parseInt(color.slice(2, 4), 16));
  const b = toLinear(Number.parseInt(color.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Returns WCAG contrast ratio between two hex colors. */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getRelativeLuminance(hex1);
  const l2 = getRelativeLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Returns a text color (#111827 or #F9FAFB) that contrasts well against the given background. */
function getContrastTextColor(hexColor: string): string {
  const contrastWithDark = getContrastRatio(hexColor, '#111827');
  const contrastWithLight = getContrastRatio(hexColor, '#F9FAFB');
  return contrastWithDark >= contrastWithLight ? '#111827' : '#F9FAFB';
}

/** Returns true if the color meets WCAG AA minimum contrast (4.5:1) against white. */
function meetsWcagAA(hexColor: string): boolean {
  return getContrastRatio(hexColor, '#FFFFFF') >= 4.5;
}

/** Converts a hex color to a valid <input type="color"> value (lowercase, 6-digit). */
function normalizeHex(hex: string): string {
  const match = /^#[0-9A-Fa-f]{6}$/.exec(hex);
  return match ? hex.toLowerCase() : '#1d4ed8';
}

export function TeamFormDialog({ open, onOpenChange, onSuccess }: TeamFormDialogProps) {
  const createTeam = useCreateTeam();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
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
  const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(color);
  const contrastTextColor = useMemo(
    () => (isValidHex ? getContrastTextColor(color) : '#111827'),
    [color, isValidHex]
  );
  const hasLowContrast = useMemo(() => isValidHex && !meetsWcagAA(color), [color, isValidHex]);

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
            <Label htmlFor="team-color-picker">Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="team-color-picker"
                type="color"
                value={normalizeHex(color)}
                onChange={(e) => {
                  setValue('color', e.target.value.toUpperCase(), {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                }}
                className="h-10 w-12 cursor-pointer rounded-md border border-input p-1"
                aria-label="Selector de color"
              />
              <Input
                id="team-color"
                type="text"
                aria-invalid={errors.color ? 'true' : undefined}
                aria-describedby={
                  errors.color
                    ? 'team-color-error'
                    : hasLowContrast
                      ? 'team-color-contrast-warning'
                      : undefined
                }
                aria-label="Color (HEX)"
                {...register('color')}
              />
              {isValidHex && (
                <div
                  className="h-10 min-w-24 rounded-md border border-border px-2 text-xs font-semibold"
                  style={{
                    backgroundColor: color,
                    color: contrastTextColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  aria-hidden="true"
                >
                  Vista previa
                </div>
              )}
            </div>
            {errors.color && (
              <p id="team-color-error" role="alert" className="text-sm text-destructive">
                {errors.color.message}
              </p>
            )}
            {!errors.color && hasLowContrast && (
              <p id="team-color-contrast-warning" role="alert" className="text-sm text-amber-600">
                Este color no supera el contraste mínimo WCAG AA (4.5:1) sobre fondo blanco. Es
                posible que no sea legible en el calendario.
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
