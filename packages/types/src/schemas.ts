import { z } from 'zod';

import { AbsenceUnit, UserRole } from './enums';

export const PASSWORD_POLICY = {
  minLength: 12,
  requiresUppercase: true,
  requiresLowercase: true,
  requiresNumber: true,
  requiresSymbol: true,
  symbols: '!@#$%^&*()_+-=[]{}|;\':",.<>?/',
} as const;

export const PasswordSchema = z
  .string()
  .min(
    PASSWORD_POLICY.minLength,
    `La contraseña debe tener al menos ${PASSWORD_POLICY.minLength} caracteres.`
  )
  .refine((val) => /[A-Z]/.test(val), {
    message: 'La contraseña debe contener al menos una letra mayúscula.',
  })
  .refine((val) => /[a-z]/.test(val), {
    message: 'La contraseña debe contener al menos una letra minúscula.',
  })
  .refine((val) => /[0-9]/.test(val), {
    message: 'La contraseña debe contener al menos un número.',
  })
  .refine((val) => /[!@#$%^&*()_+\-=[\]{}|;':",.<>?/]/.test(val), {
    message: 'La contraseña debe contener al menos un símbolo.',
  });

export const ActivateAccountSchema = z.object({
  token: z.string().min(1),
  password: PasswordSchema,
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateUserSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
  name: z.string().min(1, 'El nombre es obligatorio.'),
  role: z.nativeEnum(UserRole, { message: 'El rol no es válido.' }),
});

export const ResendActivationSchema = z.object({
  email: z.string().email('El correo electrónico no es válido.'),
});

export const CreateAbsenceTypeSchema = z
  .object({
    name: z.string().min(1),
    unit: z.nativeEnum(AbsenceUnit),
    maxPerYear: z.number().positive(),
    minDuration: z.number().positive(),
    maxDuration: z.number().positive(),
    requiresValidation: z.boolean(),
    allowPastDates: z.boolean(),
    minDaysInAdvance: z.number().int().nonnegative().nullable(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => data.maxDuration >= data.minDuration, {
    message: 'maxDuration must be greater than or equal to minDuration',
    path: ['maxDuration'],
  });

export const UpdateAbsenceTypeSchema = z
  .object({
    name: z.string().min(1).optional(),
    maxPerYear: z.number().positive().optional(),
    minDuration: z.number().positive().optional(),
    maxDuration: z.number().positive().optional(),
    requiresValidation: z.boolean().optional(),
    allowPastDates: z.boolean().optional(),
    minDaysInAdvance: z.number().int().nonnegative().nullable().optional(),
  })
  .refine(
    (data) => {
      if (data.maxDuration !== undefined && data.minDuration !== undefined) {
        return data.maxDuration >= data.minDuration;
      }
      return true;
    },
    {
      message: 'maxDuration must be greater than or equal to minDuration',
      path: ['maxDuration'],
    }
  );

export const CreateAbsenceSchema = z
  .object({
    absenceTypeId: z.string().uuid(),
    startAt: z.string().datetime(),
    endAt: z.string().datetime(),
    validatorIds: z.array(z.string().uuid()).optional(),
  })
  .refine((data) => Date.parse(data.endAt) > Date.parse(data.startAt), {
    message: 'endAt must be after startAt',
    path: ['endAt'],
  });

export const AddObservationSchema = z.object({
  absenceId: z.string().uuid(),
  content: z.string().min(1),
});
