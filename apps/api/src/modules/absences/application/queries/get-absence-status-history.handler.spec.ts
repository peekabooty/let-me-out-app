import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { AbsenceStatus } from '@repo/types';

import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { GetAbsenceStatusHistoryHandler } from './get-absence-status-history.handler';
import { GetAbsenceStatusHistoryQuery } from './get-absence-status-history.query';
import { Absence } from '../../domain/absence.entity';

describe('GetAbsenceStatusHistoryHandler', () => {
  let handler: GetAbsenceStatusHistoryHandler;
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
    status: AbsenceStatus.ACCEPTED,
    createdAt: new Date('2024-03-01T10:00:00Z'),
    updatedAt: new Date('2024-03-01T10:00:00Z'),
  });

  const mockStatusHistory = [
    {
      id: 'history-1',
      fromStatus: null,
      toStatus: AbsenceStatus.WAITING_VALIDATION,
      changedBy: userId,
      changedAt: new Date('2024-03-01T10:00:00Z'),
    },
    {
      id: 'history-2',
      fromStatus: AbsenceStatus.WAITING_VALIDATION,
      toStatus: AbsenceStatus.ACCEPTED,
      changedBy: validatorId,
      changedAt: new Date('2024-03-05T10:00:00Z'),
    },
  ];

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
        GetAbsenceStatusHistoryHandler,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
      ],
    }).compile();

    handler = module.get<GetAbsenceStatusHistoryHandler>(GetAbsenceStatusHistoryHandler);
  });

  it('should return status history for the creator', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(mockAbsence);
    mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId]);
    mockAbsenceRepository.getStatusHistory.mockResolvedValue(mockStatusHistory);

    const query = new GetAbsenceStatusHistoryQuery(absenceId, userId);
    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('history-1');
    expect(result[0].absenceId).toBe(absenceId);
    expect(result[0].fromStatus).toBeNull();
    expect(result[0].toStatus).toBe(AbsenceStatus.WAITING_VALIDATION);
    expect(result[1].toStatus).toBe(AbsenceStatus.ACCEPTED);
  });

  it('should return status history for an assigned validator', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(mockAbsence);
    mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId]);
    mockAbsenceRepository.getStatusHistory.mockResolvedValue(mockStatusHistory);

    const query = new GetAbsenceStatusHistoryQuery(absenceId, validatorId);
    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
  });

  it('should throw NotFoundException when absence does not exist', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(null);

    const query = new GetAbsenceStatusHistoryQuery(absenceId, userId);

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
  });

  it('should throw ForbiddenException when user has no access', async () => {
    mockAbsenceRepository.findById.mockResolvedValue(mockAbsence);
    mockAbsenceRepository.getAssignedValidators.mockResolvedValue([validatorId]);

    const query = new GetAbsenceStatusHistoryQuery(absenceId, otherUserId);

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
  });
});
