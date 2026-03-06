import { zodResolver } from '@hookform/resolvers/zod';
import { isAxiosError } from 'axios';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { CreateUserSchema, UserRole } from '@repo/types';
import type { User } from '@repo/types';
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
import { createUser, updateUser } from '../../lib/api-client';

const EditUserSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio'),
  role: z.nativeEnum(UserRole),
});

type CreateFormValues = z.infer<typeof CreateUserSchema>;
type EditFormValues = z.infer<typeof EditUserSchema>;

const ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.STANDARD]: 'Empleado',
  [UserRole.VALIDATOR]: 'Validador',
  [UserRole.AUDITOR]: 'Auditor',
  [UserRole.ADMIN]: 'Administrador',
};

const ROLE_OPTIONS = Object.values(UserRole).map((role) => ({
  value: role,
  label: ROLE_LABELS[role],
}));

interface UserFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User | undefined;
  onSuccess: () => void;
}

export function UserFormDialog({ open, onOpenChange, user, onSuccess }: UserFormDialogProps) {
  const isEditing = user !== undefined;

  if (isEditing) {
    return <EditDialog open={open} onOpenChange={onOpenChange} user={user} onSuccess={onSuccess} />;
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
  } = useForm<CreateFormValues>({
    resolver: zodResolver(CreateUserSchema),
    defaultValues: { role: UserRole.STANDARD },
  });

  const onSubmit = async (data: CreateFormValues) => {
    try {
      await createUser({
        email: data.email,
        name: data.name,
        role: data.role,
      });
      reset();
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      const message =
        isAxiosError(error) && error.response?.status === 409
          ? 'Ya existe un usuario con ese correo electrónico.'
          : 'Error al crear el usuario. Inténtalo de nuevo.';
      setError('root', { message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="create-name">Nombre</Label>
            <Input
              id="create-name"
              type="text"
              autoComplete="name"
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
            <Label htmlFor="create-email">Correo electrónico</Label>
            <Input
              id="create-email"
              type="email"
              autoComplete="email"
              aria-invalid={errors.email ? 'true' : undefined}
              aria-describedby={errors.email ? 'create-email-error' : undefined}
              {...register('email')}
            />
            {errors.email && (
              <p id="create-email-error" role="alert" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="create-role">Rol</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="create-role" aria-invalid={errors.role ? 'true' : undefined}>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p role="alert" className="text-sm text-destructive">
                {errors.role.message}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creando…' : 'Crear usuario'}
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
  user: User;
  onSuccess: () => void;
}

function EditDialog({ open, onOpenChange, user, onSuccess }: EditDialogProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<EditFormValues>({
    resolver: zodResolver(EditUserSchema),
    defaultValues: { name: user.name, role: user.role },
  });

  const onSubmit = async (data: EditFormValues) => {
    try {
      await updateUser(user.id, { name: data.name, role: data.role });
      onSuccess();
      onOpenChange(false);
    } catch {
      setError('root', { message: 'Error al actualizar el usuario. Inténtalo de nuevo.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar usuario</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nombre</Label>
            <Input
              id="edit-name"
              type="text"
              autoComplete="name"
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
            <Label htmlFor="edit-role">Rol</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="edit-role" aria-invalid={errors.role ? 'true' : undefined}>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p role="alert" className="text-sm text-destructive">
                {errors.role.message}
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
