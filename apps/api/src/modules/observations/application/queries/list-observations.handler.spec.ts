import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { Observation } from '../../domain/observation.entity';
import type { ObservationRepositoryPort } from '../../domain/ports/observation.repository.port';
import { Absence } from '../../../absences/domain/absence.entity';
import type { AbsenceRepositoryPort } from '../../../absences/domain/ports/absence.repository.port';
import { ObservationMapper } from '../../infrastructure/observation.mapper';
import { ListObservationsQuery } from './list-observations.query';
import { ListObservationsHandler } from './list-observations.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');
const LATER = new Date('2025-01-01T12:00:00.000Z');

const makeObservationRepo = (
  overrides: Partial<ObservationRepositoryPort> = {}
): ObservationRepositoryPort => ({
  save: jest.fn(),
  findByAbsenceId: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const makeAbsenceRepo = (
  overrides: Partial<AbsenceRepositoryPort> = {}
): AbsenceRepositoryPort => ({
  findById: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
  createStatusHistory: jest.fn(),
  calculateConsumedByUserAndTypeInYear: jest.fn(),
  hasOverlap: jest.fn(),
  ...overrides,
});

const makeAbsence = (overrides: Partial<Absence> = {}): Absence =>
  new Absence({
    id: 'absence-id',
    userId: 'creator-id',
    absenceTypeId: 'type-id',
    startAt: new Date('2025-02-01'),
    endAt: new Date('2025-02-05'),
    duration: 5,
    status: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

const makeObservation = (overrides: Partial<Observation> = {}): Observation =>
  new Observation({
    id: 'observation-id',
    absenceId: 'absence-id',
    userId: 'user-id',
    content: 'Test observation',
    createdAt: NOW,
    ...overrides,
  });

describe('ListObservationsHandler', () => {
  it('successfully lists observations when user is creator', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const observation1 = makeObservation({
      id: 'obs-1',
      userId: 'creator-id',
      content: 'First note',
      createdAt: NOW,
    });
    const observation2 = makeObservation({
      id: 'obs-2',
      userId: 'creator-id',
      content: 'Second note',
      createdAt: LATER,
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([observation1, observation2]),
    });
    const mapper = new ObservationMapper();
    const handler = new ListObservationsHandler(observationRepo, absenceRepo, mapper);
    const query = new ListObservationsQuery('absence-id', 'creator-id');

    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('obs-1');
    expect(result[0].content).toBe('First note');
    expect(result[1].id).toBe('obs-2');
    expect(result[1].content).toBe('Second note');
    expect(absenceRepo.findById).toHaveBeenCalledWith('absence-id');
    expect(observationRepo.findByAbsenceId).toHaveBeenCalledWith('absence-id');
  });

  it('throws ForbiddenException when user is not creator', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo();
    const mapper = new ObservationMapper();
    const handler = new ListObservationsHandler(observationRepo, absenceRepo, mapper);
    const query = new ListObservationsQuery('absence-id', 'other-user-id');

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Only involved users can view observations on this absence'
    );
    expect(observationRepo.findByAbsenceId).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when absence does not exist', async () => {
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const observationRepo = makeObservationRepo();
    const mapper = new ObservationMapper();
    const handler = new ListObservationsHandler(observationRepo, absenceRepo, mapper);
    const query = new ListObservationsQuery('non-existent-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Absence with ID non-existent-id not found'
    );
    expect(observationRepo.findByAbsenceId).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when user is not creator', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo();
    const mapper = new ObservationMapper();
    const handler = new ListObservationsHandler(observationRepo, absenceRepo, mapper);
    const query = new ListObservationsQuery('absence-id', 'uninvolved-user-id');

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Only involved users can view observations on this absence'
    );
    expect(observationRepo.findByAbsenceId).not.toHaveBeenCalled();
  });

  it('returns empty array when no observations exist', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([]),
    });
    const mapper = new ObservationMapper();
    const handler = new ListObservationsHandler(observationRepo, absenceRepo, mapper);
    const query = new ListObservationsQuery('absence-id', 'creator-id');

    const result = await handler.execute(query);

    expect(result).toEqual([]);
    expect(observationRepo.findByAbsenceId).toHaveBeenCalledWith('absence-id');
  });

  it('maps observations using ObservationMapper', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const observation = makeObservation({
      id: 'obs-1',
      userId: 'creator-id',
      content: 'Test content',
      createdAt: NOW,
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([observation]),
    });
    const mapper = new ObservationMapper();
    const mapperSpy = jest.spyOn(mapper, 'toResponseDto');
    const handler = new ListObservationsHandler(observationRepo, absenceRepo, mapper);
    const query = new ListObservationsQuery('absence-id', 'creator-id');

    const result = await handler.execute(query);

    expect(mapperSpy).toHaveBeenCalledTimes(1);
    expect(mapperSpy).toHaveBeenCalledWith(observation);
    expect(result[0].id).toBe('obs-1');
    expect(result[0].userId).toBe('creator-id');
    expect(result[0].content).toBe('Test content');
    expect(result[0].createdAt).toBe(NOW.toISOString());
  });
});
