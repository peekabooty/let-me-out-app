import { z } from 'zod';

import { AbsenceUnit, UserRole } from './enums';

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const CreateUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(1),
  role: z.nativeEnum(UserRole),
  isActive: z.boolean().optional(),
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
