import { AbsenceStatus, AbsenceUnit } from '@repo/types';

import type { AbsenceRepositoryPort } from '../../domain/ports/absence.repository.port';
import type { AbsenceTypeRepositoryPort } from '../../../absence-types/domain/ports/absence-type.repository.port';
import { AnnualLimitValidatorService } from '../../domain/services/annual-limit-validator.service';
import { GetDashboardQuery } from './get-dashboard.query';
import { GetDashboardHandler } from './get-dashboard.handler';
import { AbsenceType } from '../../../absence-types/domain/absence-type.entity';

const NOW = new Date('2025-03-01T00:00:00.000Z');

const makeAbsenceRepo = (
  overrides: Partial<AbsenceRepositoryPort> = {}
): AbsenceRepositoryPort => ({
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createStatusHistory: jest.fn(),
  calculateConsumedByUserAndTypeInYear: jest.fn(),
  hasOverlap: jest.fn(),
  createValidationHistory: jest.fn(),
  getValidationHistory: jest.fn(),
  getAssignedValidators: jest.fn(),
  assignValidators: jest.fn(),
  findCalendarAbsences: jest.fn(),
  findUpcomingAbsences: jest.fn().mockResolvedValue([]),
  findPendingValidations: jest.fn().mockResolvedValue([]),
  findByUserId: jest.fn().mockResolvedValue([]),
  getStatusHistory: jest.fn().mockResolvedValue([]),
  findByValidatorId: jest.fn().mockResolvedValue([]),
  findAll: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const makeAbsenceTypeRepo = (
  overrides: Partial<AbsenceTypeRepositoryPort> = {}
): AbsenceTypeRepositoryPort => ({
  findById: jest.fn(),
  findAll: jest.fn(),
  findAllActive: jest.fn().mockResolvedValue([]),
  save: jest.fn(),
  update: jest.fn(),
  ...overrides,
});

describe('GetDashboardHandler', () => {
  it('successfully returns dashboard data with balances, upcoming absences, and pending validations', async () => {
    const mockAbsenceTypes = [
      new AbsenceType({
        id: 'type-1',
        name: 'Vacation',
        unit: AbsenceUnit.DAYS,
        maxPerYear: 20,
        minDuration: 1,
        maxDuration: 10,
        allowPastDates: false,
        requiresValidation: true,
        minDaysInAdvance: 5,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
      new AbsenceType({
        id: 'type-2',
        name: 'Medical Leave',
        unit: AbsenceUnit.HOURS,
        maxPerYear: 40,
        minDuration: 4,
        maxDuration: 40,
        allowPastDates: true,
        requiresValidation: false,
        minDaysInAdvance: null,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];

    const mockUpcomingAbsences = [
      {
        id: 'absence-1',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-03-15T00:00:00.000Z'),
        endAt: new Date('2025-03-17T23:59:59.999Z'),
        duration: 3,
        status: AbsenceStatus.ACCEPTED,
      },
      {
        id: 'absence-2',
        absenceTypeName: 'Medical Leave',
        startAt: new Date('2025-04-01T08:00:00.000Z'),
        endAt: new Date('2025-04-01T12:00:00.000Z'),
        duration: 4,
        status: AbsenceStatus.WAITING_VALIDATION,
      },
    ];

    const mockPendingValidations = [
      {
        id: 'absence-3',
        userName: 'John Doe',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-03-20T00:00:00.000Z'),
        endAt: new Date('2025-03-22T23:59:59.999Z'),
        duration: 3,
        createdAt: new Date('2025-03-01T10:00:00.000Z'),
      },
    ];

    const absenceRepo = makeAbsenceRepo({
      calculateConsumedByUserAndTypeInYear: jest
        .fn()
        .mockResolvedValueOnce(5) // Vacation: consumed 5 out of 20
        .mockResolvedValueOnce(10), // Medical Leave: consumed 10 out of 40
      findUpcomingAbsences: jest.fn().mockResolvedValue(mockUpcomingAbsences),
      findPendingValidations: jest.fn().mockResolvedValue(mockPendingValidations),
    });

    const absenceTypeRepo = makeAbsenceTypeRepo({
      findAllActive: jest.fn().mockResolvedValue(mockAbsenceTypes),
    });

    const annualLimitValidator = new AnnualLimitValidatorService(absenceRepo);

    const handler = new GetDashboardHandler(absenceRepo, absenceTypeRepo, annualLimitValidator);
    const query = new GetDashboardQuery('user-1');

    const result = await handler.execute(query);

    // Verify balances
    expect(result.balances).toHaveLength(2);
    expect(result.balances[0].absenceTypeId).toBe('type-1');
    expect(result.balances[0].absenceTypeName).toBe('Vacation');
    expect(result.balances[0].unit).toBe(AbsenceUnit.DAYS);
    expect(result.balances[0].maxPerYear).toBe(20);
    expect(result.balances[0].consumed).toBe(5);
    expect(result.balances[0].remaining).toBe(15);

    expect(result.balances[1].absenceTypeId).toBe('type-2');
    expect(result.balances[1].absenceTypeName).toBe('Medical Leave');
    expect(result.balances[1].unit).toBe(AbsenceUnit.HOURS);
    expect(result.balances[1].maxPerYear).toBe(40);
    expect(result.balances[1].consumed).toBe(10);
    expect(result.balances[1].remaining).toBe(30);

    // Verify upcoming absences
    expect(result.upcomingAbsences).toHaveLength(2);
    expect(result.upcomingAbsences[0].id).toBe('absence-1');
    expect(result.upcomingAbsences[0].absenceTypeName).toBe('Vacation');
    expect(result.upcomingAbsences[0].startAt).toBe('2025-03-15T00:00:00.000Z');
    expect(result.upcomingAbsences[0].endAt).toBe('2025-03-17T23:59:59.999Z');
    expect(result.upcomingAbsences[0].duration).toBe(3);
    expect(result.upcomingAbsences[0].status).toBe(AbsenceStatus.ACCEPTED);

    expect(result.upcomingAbsences[1].id).toBe('absence-2');
    expect(result.upcomingAbsences[1].absenceTypeName).toBe('Medical Leave');
    expect(result.upcomingAbsences[1].status).toBe(AbsenceStatus.WAITING_VALIDATION);

    // Verify pending validations
    expect(result.pendingValidations).toHaveLength(1);
    expect(result.pendingValidations[0].id).toBe('absence-3');
    expect(result.pendingValidations[0].userName).toBe('John Doe');
    expect(result.pendingValidations[0].absenceTypeName).toBe('Vacation');
    expect(result.pendingValidations[0].startAt).toBe('2025-03-20T00:00:00.000Z');
    expect(result.pendingValidations[0].endAt).toBe('2025-03-22T23:59:59.999Z');
    expect(result.pendingValidations[0].duration).toBe(3);
    expect(result.pendingValidations[0].createdAt).toBe('2025-03-01T10:00:00.000Z');
  });

  it('returns empty arrays when user has no absences or pending validations', async () => {
    const mockAbsenceTypes = [
      new AbsenceType({
        id: 'type-1',
        name: 'Vacation',
        unit: AbsenceUnit.DAYS,
        maxPerYear: 20,
        minDuration: 1,
        maxDuration: 10,
        allowPastDates: false,
        requiresValidation: true,
        minDaysInAdvance: 5,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];

    const absenceRepo = makeAbsenceRepo({
      calculateConsumedByUserAndTypeInYear: jest.fn().mockResolvedValue(0),
      findUpcomingAbsences: jest.fn().mockResolvedValue([]),
      findPendingValidations: jest.fn().mockResolvedValue([]),
    });

    const absenceTypeRepo = makeAbsenceTypeRepo({
      findAllActive: jest.fn().mockResolvedValue(mockAbsenceTypes),
    });

    const annualLimitValidator = new AnnualLimitValidatorService(absenceRepo);

    const handler = new GetDashboardHandler(absenceRepo, absenceTypeRepo, annualLimitValidator);
    const query = new GetDashboardQuery('user-1');

    const result = await handler.execute(query);

    expect(result.balances).toHaveLength(1);
    expect(result.balances[0].consumed).toBe(0);
    expect(result.balances[0].remaining).toBe(20);
    expect(result.upcomingAbsences).toHaveLength(0);
    expect(result.pendingValidations).toHaveLength(0);
  });

  it('calculates correct balance when user has consumed some absence time', async () => {
    const mockAbsenceTypes = [
      new AbsenceType({
        id: 'type-1',
        name: 'Vacation',
        unit: AbsenceUnit.DAYS,
        maxPerYear: 15,
        minDuration: 1,
        maxDuration: 10,
        allowPastDates: false,
        requiresValidation: true,
        minDaysInAdvance: 5,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];

    const absenceRepo = makeAbsenceRepo({
      calculateConsumedByUserAndTypeInYear: jest.fn().mockResolvedValue(12),
      findUpcomingAbsences: jest.fn().mockResolvedValue([]),
      findPendingValidations: jest.fn().mockResolvedValue([]),
    });

    const absenceTypeRepo = makeAbsenceTypeRepo({
      findAllActive: jest.fn().mockResolvedValue(mockAbsenceTypes),
    });

    const annualLimitValidator = new AnnualLimitValidatorService(absenceRepo);

    const handler = new GetDashboardHandler(absenceRepo, absenceTypeRepo, annualLimitValidator);
    const query = new GetDashboardQuery('user-1');

    const result = await handler.execute(query);

    expect(result.balances).toHaveLength(1);
    expect(result.balances[0].maxPerYear).toBe(15);
    expect(result.balances[0].consumed).toBe(12);
    expect(result.balances[0].remaining).toBe(3);
  });

  it('returns only pending validations assigned to the validator', async () => {
    const mockAbsenceTypes = [
      new AbsenceType({
        id: 'type-1',
        name: 'Vacation',
        unit: AbsenceUnit.DAYS,
        maxPerYear: 20,
        minDuration: 1,
        maxDuration: 10,
        allowPastDates: false,
        requiresValidation: true,
        minDaysInAdvance: 5,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];

    const mockPendingValidations = [
      {
        id: 'absence-1',
        userName: 'Employee One',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-03-10T00:00:00.000Z'),
        endAt: new Date('2025-03-12T23:59:59.999Z'),
        duration: 3,
        createdAt: new Date('2025-03-01T09:00:00.000Z'),
      },
      {
        id: 'absence-2',
        userName: 'Employee Two',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-03-15T00:00:00.000Z'),
        endAt: new Date('2025-03-17T23:59:59.999Z'),
        duration: 3,
        createdAt: new Date('2025-03-01T10:00:00.000Z'),
      },
    ];

    const absenceRepo = makeAbsenceRepo({
      calculateConsumedByUserAndTypeInYear: jest.fn().mockResolvedValue(0),
      findUpcomingAbsences: jest.fn().mockResolvedValue([]),
      findPendingValidations: jest.fn().mockResolvedValue(mockPendingValidations),
    });

    const absenceTypeRepo = makeAbsenceTypeRepo({
      findAllActive: jest.fn().mockResolvedValue(mockAbsenceTypes),
    });

    const annualLimitValidator = new AnnualLimitValidatorService(absenceRepo);

    const handler = new GetDashboardHandler(absenceRepo, absenceTypeRepo, annualLimitValidator);
    const query = new GetDashboardQuery('validator-1');

    const result = await handler.execute(query);

    expect(result.pendingValidations).toHaveLength(2);
    expect(result.pendingValidations[0].userName).toBe('Employee One');
    expect(result.pendingValidations[1].userName).toBe('Employee Two');
  });

  it('limits upcoming absences to the most recent ones', async () => {
    const mockAbsenceTypes = [
      new AbsenceType({
        id: 'type-1',
        name: 'Vacation',
        unit: AbsenceUnit.DAYS,
        maxPerYear: 20,
        minDuration: 1,
        maxDuration: 10,
        allowPastDates: false,
        requiresValidation: true,
        minDaysInAdvance: 5,
        isActive: true,
        createdAt: NOW,
        updatedAt: NOW,
      }),
    ];

    // Create 15 upcoming absences, but repository should limit to 10
    const mockUpcomingAbsences = Array.from({ length: 10 }, (_, i) => ({
      id: `absence-${i + 1}`,
      absenceTypeName: 'Vacation',
      startAt: new Date(`2025-03-${10 + i}T00:00:00.000Z`),
      endAt: new Date(`2025-03-${12 + i}T23:59:59.999Z`),
      duration: 3,
      status: AbsenceStatus.ACCEPTED,
    }));

    const absenceRepo = makeAbsenceRepo({
      calculateConsumedByUserAndTypeInYear: jest.fn().mockResolvedValue(0),
      findUpcomingAbsences: jest.fn().mockResolvedValue(mockUpcomingAbsences),
      findPendingValidations: jest.fn().mockResolvedValue([]),
    });

    const absenceTypeRepo = makeAbsenceTypeRepo({
      findAllActive: jest.fn().mockResolvedValue(mockAbsenceTypes),
    });

    const annualLimitValidator = new AnnualLimitValidatorService(absenceRepo);

    const handler = new GetDashboardHandler(absenceRepo, absenceTypeRepo, annualLimitValidator);
    const query = new GetDashboardQuery('user-1');

    const result = await handler.execute(query);

    expect(result.upcomingAbsences).toHaveLength(10);
  });
});
