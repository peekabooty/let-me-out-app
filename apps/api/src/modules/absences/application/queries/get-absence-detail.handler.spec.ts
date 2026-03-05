import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { GetAbsenceDetailHandler } from './get-absence-detail.handler';
import { GetAbsenceDetailQuery } from './get-absence-detail.query';
import { Absence } from '../../domain/absence.entity';

describe('GetAbsenceDetailHandler', () => {
  let handler: GetAbsenceDetailHandler;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;

  const absenceId = 'absence-123';
  const userId = 'user-456';
  const validatorId = 'validator-789';
  const otherUserId = 'other-user-000';

  const mockAbsence = new Absence({
    id: absenceId,
    userId,
    absenceTypeId: 'type-123',
    startAt: new Date('2024-04-01T09:00:00Z'),
    endAt: new Date('2024-04-05T18:00:00Z'),
    duration: 5,
    status: AbsenceStatus.WAITING_VALIDATION,
    createdAt: new Date('2024-03-01T10:00:00Z'),
    updatedAt: new Date('2024-03-01T10:00:00Z'),
  });

  beforeEach(async () => {
    mockAbsenceRepository = {
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
      findUpcomingAbsences: jest.fn(),
      findPendingValidations: jest.fn(),
      findByUserId: jest.fn(),
      getStatusHistory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GetAbsenceDetailHandler,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAbsenceDetailHandler>(GetAbsenceDetailHandler);
  });

  it('should return absence detail for the creator', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(mockAbsence);
    mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId]);

    const query = new GetAbsenceDetailQuery(absenceId, userId);
    const result = await handler.execute(query);

    expect(result.id).toBe(absenceId);
    expect(result.userId).toBe(userId);
    expect(result.status).toBe(AbsenceStatus.WAITING_VALIDATION);
    expect(result.startAt).toBe('2024-04-01T09:00:00.000Z');
  });

  it('should return absence detail for an assigned validator', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(mockAbsence);
    mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId]);

    const query = new GetAbsenceDetailQuery(absenceId, validatorId);
    const result = await handler.execute(query);

    expect(result.id).toBe(absenceId);
  });

  it('should throw NotFoundException when absence does not exist', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(null);

    const query = new GetAbsenceDetailQuery(absenceId, userId);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user has no access to the absence', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(mockAbsence);
    mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId]);

    const query = new GetAbsenceDetailQuery(absenceId, otherUserId);

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(query)).rejects.toThrow('You do not have access to this absence');
  });
});
