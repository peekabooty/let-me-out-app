import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { AbsenceUnit } from '@repo/types';
import type { AbsenceType } from '@repo/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  createAbsenceType,
  updateAbsenceType,
  type UpdateAbsenceTypePayload,
} from '../../lib/api-client';

const CreateFormSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio'),
    unit: z.nativeEnum(AbsenceUnit),
    maxPerYear: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .positive('Debe ser mayor a 0'),
    minDuration: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .positive('Debe ser mayor a 0'),
    maxDuration: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .positive('Debe ser mayor a 0'),
    requiresValidation: z.boolean(),
    allowPastDates: z.boolean(),
    minDaysInAdvance: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .int('Debe ser un número entero')
      .nonnegative('No puede ser negativo')
      .nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.maxDuration >= data.minDuration, {
    message: 'La duración máxima debe ser mayor o igual a la mínima',
    path: ['maxDuration'],
  });

const EditFormSchema = z
  .object({
    name: z.string().min(1, 'El nombre es obligatorio').optional(),
    maxPerYear: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .positive('Debe ser mayor a 0')
      .optional(),
    minDuration: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .positive('Debe ser mayor a 0')
      .optional(),
    maxDuration: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .positive('Debe ser mayor a 0')
      .optional(),
    requiresValidation: z.boolean().optional(),
    allowPastDates: z.boolean().optional(),
    minDaysInAdvance: z
      .number({ invalid_type_error: 'Debe ser un número' })
      .int('Debe ser un número entero')
      .nonnegative('No puede ser negativo')
      .nullable()
      .optional(),
  })
  .refine(
    (data) => {
      if (data.maxDuration !== undefined && data.minDuration !== undefined) {
        return data.maxDuration >= data.minDuration;
      }
      return true;
    },
    {
      message: 'La duración máxima debe ser mayor o igual a la mínima',
      path: ['maxDuration'],
    }
  );

type CreateFormValues = z.infer<typeof CreateFormSchema>;
type EditFormValues = z.infer<typeof EditFormSchema>;

const UNIT_LABELS: Record<AbsenceUnit, string> = {
  [AbsenceUnit.HOURS]: 'Horas',
  [AbsenceUnit.DAYS]: 'Días',
};

const UNIT_OPTIONS = Object.values(AbsenceUnit).map((unit) => ({
  value: unit,
  label: UNIT_LABELS[unit],
}));

interface AbsenceTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absenceType: AbsenceType | undefined;
  onSuccess: () => void;
}

export function AbsenceTypeFormDialog({
  open,
  onOpenChange,
  absenceType,
  onSuccess,
}: AbsenceTypeFormDialogProps) {
  const isEditing = absenceType !== undefined;

  if (isEditing) {
    return (
      <EditDialog
        open={open}
        onOpenChange={onOpenChange}
        absenceType={absenceType}
        onSuccess={onSuccess}
      />
    );
  }

  return <CreateDialog open={open} onOpenChange={onOpenChange} onSuccess={onSuccess} />;
}

interface CreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CreateDialog({ open, onOpenChange, onSuccess }: CreateDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<CreateFormValues>({
    resolver: zodResolver(CreateFormSchema),
    defaultValues: {
      unit: AbsenceUnit.DAYS,
      requiresValidation: true,
      allowPastDates: false,
      minDaysInAdvance: null,
      isActive: true,
    },
  });

  const requiresValidation = watch('requiresValidation');

  const onSubmit = async (data: CreateFormValues) => {
    try {
      await createAbsenceType({
        name: data.name,
        unit: data.unit,
        maxPerYear: data.maxPerYear,
        minDuration: data.minDuration,
        maxDuration: data.maxDuration,
        requiresValidation: data.requiresValidation,
        allowPastDates: data.allowPastDates,
        minDaysInAdvance: data.minDaysInAdvance,
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 409
          ? 'Ya existe un tipo de ausencia con ese nombre.'
          : 'Error al crear el tipo de ausencia. Inténtalo de nuevo.';
      setError('root', { message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo tipo de ausencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Nombre</Label>
            <Input
              id="create-name"
              type="text"
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? 'create-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="create-name-error" role="alert" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-unit">Unidad</Label>
            <Controller
              name="unit"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-unit" aria-invalid={errors.unit ? 'true' : undefined}>
                    <SelectValue placeholder="Selecciona una unidad" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    {UNIT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.unit && (
              <p role="alert" className="text-sm text-destructive">
                {errors.unit.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-maxPerYear">Máximo por año</Label>
            <Input
              id="create-maxPerYear"
              type="number"
              min="1"
              step="1"
              aria-invalid={errors.maxPerYear ? 'true' : undefined}
              aria-describedby={errors.maxPerYear ? 'create-maxPerYear-error' : undefined}
              {...register('maxPerYear', { valueAsNumber: true })}
            />
            {errors.maxPerYear && (
              <p id="create-maxPerYear-error" role="alert" className="text-sm text-destructive">
                {errors.maxPerYear.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="create-minDuration">Duración mínima</Label>
              <Input
                id="create-minDuration"
                type="number"
                min="1"
                step="0.5"
                aria-invalid={errors.minDuration ? 'true' : undefined}
                aria-describedby={errors.minDuration ? 'create-minDuration-error' : undefined}
                {...register('minDuration', { valueAsNumber: true })}
              />
              {errors.minDuration && (
                <p id="create-minDuration-error" role="alert" className="text-sm text-destructive">
                  {errors.minDuration.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="create-maxDuration">Duración máxima</Label>
              <Input
                id="create-maxDuration"
                type="number"
                min="1"
                step="0.5"
                aria-invalid={errors.maxDuration ? 'true' : undefined}
                aria-describedby={errors.maxDuration ? 'create-maxDuration-error' : undefined}
                {...register('maxDuration', { valueAsNumber: true })}
              />
              {errors.maxDuration && (
                <p id="create-maxDuration-error" role="alert" className="text-sm text-destructive">
                  {errors.maxDuration.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Controller
                name="requiresValidation"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="create-requiresValidation"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="create-requiresValidation" className="font-normal">
                Requiere validación
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="allowPastDates"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="create-allowPastDates"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="create-allowPastDates" className="font-normal">
                Permite fechas pasadas
              </Label>
            </div>
          </div>

          {requiresValidation && (
            <div className="space-y-1.5">
              <Label htmlFor="create-minDaysInAdvance">
                Días mínimos de anticipación (opcional)
              </Label>
              <Input
                id="create-minDaysInAdvance"
                type="number"
                min="0"
                step="1"
                placeholder="Dejar vacío si no aplica"
                aria-invalid={errors.minDaysInAdvance ? 'true' : undefined}
                aria-describedby={
                  errors.minDaysInAdvance ? 'create-minDaysInAdvance-error' : undefined
                }
                {...register('minDaysInAdvance', {
                  setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                })}
              />
              {errors.minDaysInAdvance && (
                <p
                  id="create-minDaysInAdvance-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.minDaysInAdvance.message}
                </p>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear tipo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  absenceType: AbsenceType;
  onSuccess: () => void;
}

function EditDialog({ open, onOpenChange, absenceType, onSuccess }: EditDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
    watch,
  } = useForm<EditFormValues>({
    resolver: zodResolver(EditFormSchema),
    defaultValues: {
      name: absenceType.name,
      maxPerYear: absenceType.maxPerYear,
      minDuration: absenceType.minDuration,
      maxDuration: absenceType.maxDuration,
      requiresValidation: absenceType.requiresValidation,
      allowPastDates: absenceType.allowPastDates,
      minDaysInAdvance: absenceType.minDaysInAdvance,
    },
  });

  const requiresValidation = watch('requiresValidation');

  const onSubmit = async (data: EditFormValues) => {
    try {
      // Only include fields that have been set (not undefined)
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.maxPerYear !== undefined) payload.maxPerYear = data.maxPerYear;
      if (data.minDuration !== undefined) payload.minDuration = data.minDuration;
      if (data.maxDuration !== undefined) payload.maxDuration = data.maxDuration;
      if (data.requiresValidation !== undefined)
        payload.requiresValidation = data.requiresValidation;
      if (data.allowPastDates !== undefined) payload.allowPastDates = data.allowPastDates;
      if (data.minDaysInAdvance !== undefined) payload.minDaysInAdvance = data.minDaysInAdvance;

      await updateAbsenceType(absenceType.id, payload as UpdateAbsenceTypePayload);
      onSuccess();
      onOpenChange(false);
    } catch {
      setError('root', { message: 'Error al actualizar el tipo de ausencia. Inténtalo de nuevo.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar tipo de ausencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              type="text"
              aria-invalid={errors.name ? 'true' : undefined}
              aria-describedby={errors.name ? 'edit-name-error' : undefined}
              {...register('name')}
            />
            {errors.name && (
              <p id="edit-name-error" role="alert" className="text-sm text-destructive">
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-unit">Unidad (no modificable)</Label>
            <Input
              id="edit-unit"
              type="text"
              value={UNIT_LABELS[absenceType.unit]}
              disabled
              className="bg-muted"
            />
            <p className="text-xs text-muted-foreground">
              La unidad no se puede modificar después de la creación
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-maxPerYear">Máximo por año</Label>
            <Input
              id="edit-maxPerYear"
              type="number"
              min="1"
              step="1"
              aria-invalid={errors.maxPerYear ? 'true' : undefined}
              aria-describedby={errors.maxPerYear ? 'edit-maxPerYear-error' : undefined}
              {...register('maxPerYear', { valueAsNumber: true })}
            />
            {errors.maxPerYear && (
              <p id="edit-maxPerYear-error" role="alert" className="text-sm text-destructive">
                {errors.maxPerYear.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="edit-minDuration">Duración mínima</Label>
              <Input
                id="edit-minDuration"
                type="number"
                min="1"
                step="0.5"
                aria-invalid={errors.minDuration ? 'true' : undefined}
                aria-describedby={errors.minDuration ? 'edit-minDuration-error' : undefined}
                {...register('minDuration', { valueAsNumber: true })}
              />
              {errors.minDuration && (
                <p id="edit-minDuration-error" role="alert" className="text-sm text-destructive">
                  {errors.minDuration.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-maxDuration">Duración máxima</Label>
              <Input
                id="edit-maxDuration"
                type="number"
                min="1"
                step="0.5"
                aria-invalid={errors.maxDuration ? 'true' : undefined}
                aria-describedby={errors.maxDuration ? 'edit-maxDuration-error' : undefined}
                {...register('maxDuration', { valueAsNumber: true })}
              />
              {errors.maxDuration && (
                <p id="edit-maxDuration-error" role="alert" className="text-sm text-destructive">
                  {errors.maxDuration.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Controller
                name="requiresValidation"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="edit-requiresValidation"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="edit-requiresValidation" className="font-normal">
                Requiere validación
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="allowPastDates"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="edit-allowPastDates"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="edit-allowPastDates" className="font-normal">
                Permite fechas pasadas
              </Label>
            </div>
          </div>

          {requiresValidation && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-minDaysInAdvance">Días mínimos de anticipación (opcional)</Label>
              <Input
                id="edit-minDaysInAdvance"
                type="number"
                min="0"
                step="1"
                placeholder="Dejar vacío si no aplica"
                aria-invalid={errors.minDaysInAdvance ? 'true' : undefined}
                aria-describedby={
                  errors.minDaysInAdvance ? 'edit-minDaysInAdvance-error' : undefined
                }
                {...register('minDaysInAdvance', {
                  setValueAs: (v) => (v === '' || v === null ? null : Number(v)),
                })}
              />
              {errors.minDaysInAdvance && (
                <p
                  id="edit-minDaysInAdvance-error"
                  role="alert"
                  className="text-sm text-destructive"
                >
                  {errors.minDaysInAdvance.message}
                </p>
              )}
            </div>
          )}

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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
