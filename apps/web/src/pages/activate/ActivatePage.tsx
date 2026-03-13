import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useSearch } from '@tanstack/react-router';
import { isAxiosError } from 'axios';
import { CheckIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { ActivateAccountSchema, PASSWORD_POLICY } from '@repo/types';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AvatarPicker } from '../../components/profile/AvatarPicker';
import { activateAccount } from '../../lib/api-client';

type ActivateFormValues = z.infer<typeof ActivateAccountSchema>;

interface PolicyCheckProps {
  met: boolean;
  label: string;
}

function PolicyCheck({ met, label }: PolicyCheckProps) {
  return (
    <li className="flex items-center gap-1.5 text-sm">
      {met ? (
        <CheckIcon className="h-4 w-4 shrink-0 text-green-600" aria-hidden="true" />
      ) : (
        <XIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}
      <span className={met ? 'text-green-700' : 'text-muted-foreground'}>{label}</span>
    </li>
  );
}

interface PasswordPolicyChecksProps {
  password: string;
}

function PasswordPolicyChecks({ password }: PasswordPolicyChecksProps) {
  const checks = [
    {
      label: `Mínimo ${PASSWORD_POLICY.minLength} caracteres`,
      met: password.length >= PASSWORD_POLICY.minLength,
    },
    {
      label: 'Al menos una letra mayúscula',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'Al menos una letra minúscula',
      met: /[a-z]/.test(password),
    },
    {
      label: 'Al menos un número',
      met: /[0-9]/.test(password),
    },
    {
      label: 'Al menos un símbolo',
      met: /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/]/.test(password),
    },
  ];

  return (
    <ul
      aria-label="Requisitos de la contraseña"
      className="mt-2 space-y-1 rounded-md border bg-muted/50 px-3 py-2"
    >
      {checks.map((check) => (
        <PolicyCheck key={check.label} met={check.met} label={check.label} />
      ))}
    </ul>
  );
}

export function ActivatePage() {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { token?: string };
  const token = search.token ?? '';
  const [isActivationDone, setIsActivationDone] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<ActivateFormValues>({
    resolver: zodResolver(ActivateAccountSchema),
    defaultValues: { token, password: '' },
  });

  const passwordValue = useWatch({ control, name: 'password' });

  const onSubmit = async (data: ActivateFormValues) => {
    try {
      await activateAccount({ token: data.token, password: data.password });
      setIsActivationDone(true);
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;

      if (status === 404) {
        setError('root', { message: 'El enlace de activación no es válido.' });
        return;
      }

      const message =
        status === 400
          ? 'El enlace de activación ha expirado. Solicita uno nuevo al administrador.'
          : 'Error inesperado. Inténtalo de nuevo.';
      setError('root', { message });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="space-y-1 pb-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">Let Me Out</p>
          <h1 className="text-2xl font-semibold leading-none tracking-tight">
            {isActivationDone ? 'Elige tu avatar' : 'Activa tu cuenta'}
          </h1>
          <CardDescription>
            {isActivationDone
              ? 'Este paso es opcional. Puedes hacerlo ahora o más tarde.'
              : 'Elige una contraseña para activar tu acceso.'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {isActivationDone ? (
            <AvatarPicker
              onCompleted={() => {
                void navigate({ to: '/login' });
              }}
              onSkip={() => {
                void navigate({ to: '/login' });
              }}
            />
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <input type="hidden" {...register('token')} />

              <div className="space-y-1.5">
                <Label htmlFor="password">Contraseña</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={errors.password ? 'true' : undefined}
                  aria-describedby="password-requirements password-error"
                  {...register('password')}
                />

                <div id="password-requirements">
                  <PasswordPolicyChecks password={passwordValue ?? ''} />
                </div>

                {errors.password && (
                  <p id="password-error" role="alert" className="text-sm text-destructive">
                    {errors.password.message}
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

              <Button type="submit" disabled={isSubmitting || !token} className="w-full">
                {isSubmitting ? 'Activando…' : 'Activar cuenta'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
