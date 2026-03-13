import { AbsenceStatus } from '@repo/types';

import type { AbsenceRepositoryPort } from '../../domain/ports/absence.repository.port';
import { GetCalendarAbsencesQuery } from './get-calendar-absences.query';
import { GetCalendarAbsencesHandler } from './get-calendar-absences.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

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
  findCalendarAbsences: jest.fn().mockResolvedValue([]),
  findUpcomingAbsences: jest.fn().mockResolvedValue([]),
  findPendingValidations: jest.fn().mockResolvedValue([]),
  findByUserId: jest.fn().mockResolvedValue([]),
  getStatusHistory: jest.fn().mockResolvedValue([]),
  findByValidatorId: jest.fn().mockResolvedValue([]),
  findAll: jest.fn().mockResolvedValue([]),
  ...overrides,
});

describe('GetCalendarAbsencesHandler', () => {
  it('successfully returns calendar absences for a user', async () => {
    const mockAbsences = [
      {
        id: 'absence-1',
        userId: 'user-1',
        userName: 'John Doe',
        absenceTypeId: 'type-1',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-02-01T00:00:00.000Z'),
        endAt: new Date('2025-02-05T23:59:59.999Z'),
        duration: 5,
        status: AbsenceStatus.ACCEPTED,
        teamColor: null,
        avatarUrl: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
      {
        id: 'absence-2',
        userId: 'user-2',
        userName: 'Jane Smith',
        absenceTypeId: 'type-1',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-02-10T00:00:00.000Z'),
        endAt: new Date('2025-02-12T23:59:59.999Z'),
        duration: 3,
        status: AbsenceStatus.ACCEPTED,
        teamColor: '#FF0000',
        avatarUrl: '/users/user-2/avatar',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];

    const absenceRepo = makeAbsenceRepo({
      findCalendarAbsences: jest.fn().mockResolvedValue(mockAbsences),
    });

    const handler = new GetCalendarAbsencesHandler(absenceRepo);
    const query = new GetCalendarAbsencesQuery('user-1');

    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('absence-1');
    expect(result[0].userId).toBe('user-1');
    expect(result[0].userName).toBe('John Doe');
    expect(result[0].absenceTypeName).toBe('Vacation');
    expect(result[0].isOwn).toBe(true);
    expect(result[0].teamColor).toBeNull();
    expect(result[0].avatarUrl).toBeNull();
    expect(result[0].startAt).toBe('2025-02-01T00:00:00.000Z');
    expect(result[0].endAt).toBe('2025-02-05T23:59:59.999Z');

    expect(result[1].id).toBe('absence-2');
    expect(result[1].userId).toBe('user-2');
    expect(result[1].userName).toBe('Jane Smith');
    expect(result[1].isOwn).toBe(false);
    expect(result[1].teamColor).toBe('#FF0000');
    expect(result[1].avatarUrl).toBe('/users/user-2/avatar');

    expect(absenceRepo.findCalendarAbsences).toHaveBeenCalledWith('user-1');
  });

  it('returns empty array when user has no absences', async () => {
    const absenceRepo = makeAbsenceRepo({
      findCalendarAbsences: jest.fn().mockResolvedValue([]),
    });

    const handler = new GetCalendarAbsencesHandler(absenceRepo);
    const query = new GetCalendarAbsencesQuery('user-1');

    const result = await handler.execute(query);

    expect(result).toEqual([]);
    expect(absenceRepo.findCalendarAbsences).toHaveBeenCalledWith('user-1');
  });

  it('correctly marks own absences with isOwn=true and teamColor=null', async () => {
    const mockAbsences = [
      {
        id: 'absence-1',
        userId: 'user-1',
        userName: 'John Doe',
        absenceTypeId: 'type-1',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-02-01T00:00:00.000Z'),
        endAt: new Date('2025-02-05T23:59:59.999Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        teamColor: null,
        avatarUrl: null,
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];

    const absenceRepo = makeAbsenceRepo({
      findCalendarAbsences: jest.fn().mockResolvedValue(mockAbsences),
    });

    const handler = new GetCalendarAbsencesHandler(absenceRepo);
    const query = new GetCalendarAbsencesQuery('user-1');

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].isOwn).toBe(true);
    expect(result[0].teamColor).toBeNull();
    expect(result[0].userId).toBe('user-1');
  });

  it('correctly marks team absences with isOwn=false and includes teamColor', async () => {
    const mockAbsences = [
      {
        id: 'absence-2',
        userId: 'user-2',
        userName: 'Jane Smith',
        absenceTypeId: 'type-1',
        absenceTypeName: 'Sick Leave',
        startAt: new Date('2025-02-10T00:00:00.000Z'),
        endAt: new Date('2025-02-12T23:59:59.999Z'),
        duration: 3,
        status: AbsenceStatus.ACCEPTED,
        teamColor: '#00FF00',
        avatarUrl: '/users/user-2/avatar',
        createdAt: NOW,
        updatedAt: NOW,
      },
    ];

    const absenceRepo = makeAbsenceRepo({
      findCalendarAbsences: jest.fn().mockResolvedValue(mockAbsences),
    });

    const handler = new GetCalendarAbsencesHandler(absenceRepo);
    const query = new GetCalendarAbsencesQuery('user-1');

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].isOwn).toBe(false);
    expect(result[0].teamColor).toBe('#00FF00');
    expect(result[0].avatarUrl).toBe('/users/user-2/avatar');
    expect(result[0].userId).toBe('user-2');
    expect(result[0].userName).toBe('Jane Smith');
  });

  it('converts Date objects to ISO strings in response', async () => {
    const mockAbsences = [
      {
        id: 'absence-1',
        userId: 'user-1',
        userName: 'John Doe',
        absenceTypeId: 'type-1',
        absenceTypeName: 'Vacation',
        startAt: new Date('2025-02-01T00:00:00.000Z'),
        endAt: new Date('2025-02-05T23:59:59.999Z'),
        duration: 5,
        status: null,
        teamColor: null,
        avatarUrl: null,
        createdAt: new Date('2025-01-15T10:00:00.000Z'),
        updatedAt: new Date('2025-01-15T10:00:00.000Z'),
      },
    ];

    const absenceRepo = makeAbsenceRepo({
      findCalendarAbsences: jest.fn().mockResolvedValue(mockAbsences),
    });

    const handler = new GetCalendarAbsencesHandler(absenceRepo);
    const query = new GetCalendarAbsencesQuery('user-1');

    const result = await handler.execute(query);

    expect(result[0].startAt).toBe('2025-02-01T00:00:00.000Z');
    expect(result[0].endAt).toBe('2025-02-05T23:59:59.999Z');
    expect(result[0].createdAt).toBe('2025-01-15T10:00:00.000Z');
    expect(result[0].updatedAt).toBe('2025-01-15T10:00:00.000Z');
  });
});
