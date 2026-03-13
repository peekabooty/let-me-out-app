import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { UserRole } from '@repo/types';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAbsenceTypes } from '../../hooks/use-absence-types';
import { useUsers } from '../../hooks/use-users';
import { useCreateAbsence } from '../../hooks/use-absences';

const LocalDateTimeSchema = z
  .string()
  .min(1, 'La fecha y hora es obligatoria.')
  .refine((value) => !Number.isNaN(new Date(value).getTime()), {
    message: 'La fecha y hora no es válida.',
  });

const AbsenceFormSchema = z
  .object({
    absenceTypeId: z.string().uuid('El tipo de ausencia no es válido.'),
    startAt: LocalDateTimeSchema,
    endAt: LocalDateTimeSchema,
    validatorIds: z.array(z.string().uuid()).optional(),
  })
  .refine((data) => Date.parse(data.endAt) > Date.parse(data.startAt), {
    message: 'La fecha de fin debe ser posterior a la de inicio.',
    path: ['endAt'],
  });

type FormValues = z.infer<typeof AbsenceFormSchema>;

interface AbsenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AbsenceFormDialog({ open, onOpenChange, onSuccess }: AbsenceFormDialogProps) {
  const { absenceTypes, isLoading: isLoadingTypes } = useAbsenceTypes(true);
  const { users, isLoading: isLoadingUsers } = useUsers();
  const createAbsence = useCreateAbsence();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(AbsenceFormSchema),
    defaultValues: {
      validatorIds: [],
    },
  });

  const selectedAbsenceTypeId = watch('absenceTypeId');
  const selectedAbsenceType = absenceTypes.find((type) => type.id === selectedAbsenceTypeId);

  const validatorUsers = users.filter(
    (user) => user.role === UserRole.VALIDATOR || user.role === UserRole.ADMIN
  );

  const onSubmit = async (data: FormValues) => {
    const startAtDate = new Date(data.startAt);
    const endAtDate = new Date(data.endAt);

    if (Number.isNaN(startAtDate.getTime()) || Number.isNaN(endAtDate.getTime())) {
      setError('root', { message: 'La fecha y hora introducida no es válida.' });
      return;
    }

    try {
      await createAbsence.mutateAsync({
        absenceTypeId: data.absenceTypeId,
        startAt: startAtDate.toISOString(),
        endAt: endAtDate.toISOString(),
        ...(data.validatorIds &&
          data.validatorIds.length > 0 && { validatorIds: data.validatorIds }),
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message = isAxiosError(error)
        ? error.response?.data?.message || 'Error al crear la ausencia. Inténtalo de nuevo.'
        : 'Error al crear la ausencia. Inténtalo de nuevo.';
      setError('root', { message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nueva ausencia</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="absenceTypeId">Tipo de ausencia</Label>
            <Controller
              name="absenceTypeId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isLoadingTypes}
                >
                  <SelectTrigger
                    id="absenceTypeId"
                    aria-invalid={errors.absenceTypeId ? 'true' : undefined}
                  >
                    <SelectValue placeholder="Selecciona un tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {absenceTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.absenceTypeId && (
              <p role="alert" className="text-sm text-destructive">
                {errors.absenceTypeId.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="startAt">Fecha y hora de inicio</Label>
            <Input
              id="startAt"
              type="datetime-local"
              aria-invalid={errors.startAt ? 'true' : undefined}
              aria-describedby={errors.startAt ? 'startAt-error' : undefined}
              {...register('startAt')}
            />
            {errors.startAt && (
              <p id="startAt-error" role="alert" className="text-sm text-destructive">
                {errors.startAt.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="endAt">Fecha y hora de fin</Label>
            <Input
              id="endAt"
              type="datetime-local"
              aria-invalid={errors.endAt ? 'true' : undefined}
              aria-describedby={errors.endAt ? 'endAt-error' : undefined}
              {...register('endAt')}
            />
            {errors.endAt && (
              <p id="endAt-error" role="alert" className="text-sm text-destructive">
                {errors.endAt.message}
              </p>
            )}
          </div>

          {selectedAbsenceType?.requiresValidation && (
            <div className="space-y-1.5">
              <Label htmlFor="validatorIds">Validadores (opcional)</Label>
              <Controller
                name="validatorIds"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value?.[0] ?? ''}
                    onValueChange={(value) => field.onChange(value ? [value] : [])}
                    disabled={isLoadingUsers}
                  >
                    <SelectTrigger id="validatorIds">
                      <SelectValue placeholder="Selecciona un validador" />
                    </SelectTrigger>
                    <SelectContent>
                      {validatorUsers.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.validatorIds && (
                <p role="alert" className="text-sm text-destructive">
                  {errors.validatorIds.message}
                </p>
              )}
              <p className="text-sm text-muted-foreground">
                Si no seleccionas ninguno, se asignará automáticamente según el equipo.
              </p>
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
              {isSubmitting ? 'Creando…' : 'Crear ausencia'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
