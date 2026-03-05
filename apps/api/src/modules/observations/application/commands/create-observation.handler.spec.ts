import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { ClockService, generateId } from '../../../../common';
import { Observation } from '../../domain/observation.entity';
import type { ObservationRepositoryPort } from '../../domain/ports/observation.repository.port';
import { Absence } from '../../../absences/domain/absence.entity';
import type { AbsenceRepositoryPort } from '../../../absences/domain/ports/absence.repository.port';
import { CreateObservationCommand } from './create-observation.command';
import { CreateObservationHandler } from './create-observation.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const makeObservationRepo = (
  overrides: Partial<ObservationRepositoryPort> = {}
): ObservationRepositoryPort => ({
  save: jest.fn(),
  findByAbsenceId: jest.fn(),
  findById: jest.fn(),
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
  createValidationHistory: jest.fn(),
  getValidationHistory: jest.fn(),
  getAssignedValidators: jest.fn().mockResolvedValue([]),
  assignValidators: jest.fn(),
  findCalendarAbsences: jest.fn(),
  findUpcomingAbsences: jest.fn(),
  findPendingValidations: jest.fn(),
  findByUserId: jest.fn(),
  getStatusHistory: jest.fn(),
  findByValidatorId: jest.fn(),
  findAll: jest.fn(),
  ...overrides,
});

const makeClockService = (): ClockService => ({
  now: jest.fn().mockReturnValue(NOW),
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

// Mock generateId to return predictable values
jest.mock('../../../../common', () => ({
  ...jest.requireActual('../../../../common'),
  generateId: jest.fn(),
}));

describe('CreateObservationHandler', () => {
  beforeEach(() => {
    (generateId as jest.Mock).mockReturnValue('generated-observation-id');
  });

  it('successfully creates observation when user is creator', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const observationRepo = makeObservationRepo();
    const clock = makeClockService();
    const handler = new CreateObservationHandler(observationRepo, absenceRepo, clock);
    const command = new CreateObservationCommand('absence-id', 'creator-id', 'This is a note');

    const result = await handler.execute(command);

    expect(result).toBe('generated-observation-id');
    expect(absenceRepo.findById).toHaveBeenCalledWith('absence-id');
    expect(observationRepo.save).toHaveBeenCalledTimes(1);
    const savedObservation = (observationRepo.save as jest.Mock).mock.calls[0][0] as Observation;
    expect(savedObservation.id).toBe('generated-observation-id');
    expect(savedObservation.absenceId).toBe('absence-id');
    expect(savedObservation.userId).toBe('creator-id');
    expect(savedObservation.content).toBe('This is a note');
    expect(savedObservation.createdAt).toEqual(NOW);
  });

  it('successfully creates observation when user is an assigned validator', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });
    const observationRepo = makeObservationRepo();
    const clock = makeClockService();
    const handler = new CreateObservationHandler(observationRepo, absenceRepo, clock);
    const command = new CreateObservationCommand('absence-id', 'validator-id', 'Validator note');

    const result = await handler.execute(command);

    expect(result).toBe('generated-observation-id');
    expect(observationRepo.save).toHaveBeenCalledTimes(1);
    const savedObservation = (observationRepo.save as jest.Mock).mock.calls[0][0] as Observation;
    expect(savedObservation.userId).toBe('validator-id');
  });

  it('throws ForbiddenException when user is neither creator nor validator', async () => {
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });
    const observationRepo = makeObservationRepo();
    const clock = makeClockService();
    const handler = new CreateObservationHandler(observationRepo, absenceRepo, clock);
    const command = new CreateObservationCommand(
      'absence-id',
      'uninvolved-user-id',
      'I should not be able to post'
    );

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Only involved users can create observations on this absence'
    );
    expect(observationRepo.save).not.toHaveBeenCalled();
  });

  it('throws NotFoundException when absence does not exist', async () => {
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(null),
    });
    const observationRepo = makeObservationRepo();
    const clock = makeClockService();
    const handler = new CreateObservationHandler(observationRepo, absenceRepo, clock);
    const command = new CreateObservationCommand('non-existent-id', 'user-id', 'Content');

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Absence with ID non-existent-id not found'
    );
    expect(observationRepo.save).not.toHaveBeenCalled();
  });

  it('uses ClockService for timestamp', async () => {
    const customTime = new Date('2025-06-15T12:30:00.000Z');
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo();
    const clock = { now: jest.fn().mockReturnValue(customTime) };
    const handler = new CreateObservationHandler(observationRepo, absenceRepo, clock);
    const command = new CreateObservationCommand('absence-id', 'creator-id', 'Content');

    await handler.execute(command);

    expect(clock.now).toHaveBeenCalledTimes(1);
    const savedObservation = (observationRepo.save as jest.Mock).mock.calls[0][0] as Observation;
    expect(savedObservation.createdAt).toEqual(customTime);
  });

  it('uses generateId for observation ID', async () => {
    (generateId as jest.Mock).mockReturnValue('custom-generated-id');
    const absence = makeAbsence({ userId: 'creator-id' });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
    });
    const observationRepo = makeObservationRepo();
    const clock = makeClockService();
    const handler = new CreateObservationHandler(observationRepo, absenceRepo, clock);
    const command = new CreateObservationCommand('absence-id', 'creator-id', 'Content');

    const result = await handler.execute(command);

    expect(result).toBe('custom-generated-id');
    expect(generateId).toHaveBeenCalledTimes(1);
  });
});
