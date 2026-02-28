import { describe, expect, it } from 'vitest';

import {
  AddObservationSchema,
  CreateAbsenceSchema,
  CreateAbsenceTypeSchema,
  CreateUserSchema,
  LoginSchema,
} from './schemas';

describe('LoginSchema', () => {
  it('accepts valid credentials', () => {
    const result = LoginSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
    });

    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = LoginSchema.safeParse({
      email: 'not-an-email',
      password: 'secret',
    });

    expect(result.success).toBe(false);
  });
});

describe('CreateUserSchema', () => {
  it('accepts valid payload', () => {
    const result = CreateUserSchema.safeParse({
      email: 'user@example.com',
      name: 'User Name',
      password: 'secret',
      role: 'standard',
    });

    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = CreateUserSchema.safeParse({
      email: 'user@example.com',
      password: 'secret',
      role: 'standard',
    });

    expect(result.success).toBe(false);
  });
});

describe('CreateAbsenceTypeSchema', () => {
  it('accepts valid payload', () => {
    const result = CreateAbsenceTypeSchema.safeParse({
      name: 'Vacaciones',
      unit: 'days',
      maxPerYear: 20,
      minDuration: 1,
      maxDuration: 10,
      requiresValidation: true,
      allowPastDates: false,
      minDaysInAdvance: 15,
    });

    expect(result.success).toBe(true);
  });

  it('rejects maxDuration lower than minDuration', () => {
    const result = CreateAbsenceTypeSchema.safeParse({
      name: 'Vacaciones',
      unit: 'days',
      maxPerYear: 20,
      minDuration: 5,
      maxDuration: 1,
      requiresValidation: true,
      allowPastDates: false,
      minDaysInAdvance: 15,
    });

    expect(result.success).toBe(false);
  });
});

describe('CreateAbsenceSchema', () => {
  it('accepts valid payload', () => {
    const result = CreateAbsenceSchema.safeParse({
      absenceTypeId: 'f1cf5d35-9d5c-4a4d-9db7-6a3eb53db0f6',
      startAt: '2026-02-01T09:00:00.000Z',
      endAt: '2026-02-01T17:00:00.000Z',
      validatorIds: ['1b9c7cc6-5f7c-4c2f-93ad-32b8a8d6f0df'],
    });

    expect(result.success).toBe(true);
  });

  it('rejects endAt before startAt', () => {
    const result = CreateAbsenceSchema.safeParse({
      absenceTypeId: 'f1cf5d35-9d5c-4a4d-9db7-6a3eb53db0f6',
      startAt: '2026-02-01T17:00:00.000Z',
      endAt: '2026-02-01T09:00:00.000Z',
    });

    expect(result.success).toBe(false);
  });
});

describe('AddObservationSchema', () => {
  it('accepts valid payload', () => {
    const result = AddObservationSchema.safeParse({
      absenceId: 'f1cf5d35-9d5c-4a4d-9db7-6a3eb53db0f6',
      content: 'Needs clarification on dates.',
    });

    expect(result.success).toBe(true);
  });

  it('rejects empty content', () => {
    const result = AddObservationSchema.safeParse({
      absenceId: 'f1cf5d35-9d5c-4a4d-9db7-6a3eb53db0f6',
      content: '',
    });

    expect(result.success).toBe(false);
  });
});
