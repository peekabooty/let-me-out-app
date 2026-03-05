import { Test, TestingModule } from '@nestjs/testing';
import { AbsenceStatus } from '@repo/types';

import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { ListUserAbsencesHandler } from './list-user-absences.handler';
import { ListUserAbsencesQuery } from './list-user-absences.query';

describe('ListUserAbsencesHandler', () => {
  let handler: ListUserAbsencesHandler;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;

  const userId = 'user-456';

  const mockAbsenceRows = [
    {
      id: 'absence-1',
      absenceTypeId: 'type-1',
      absenceTypeName: 'Annual Leave',
      startAt: new Date('2024-04-10T09:00:00Z'),
      endAt: new Date('2024-04-12T18:00:00Z'),
      duration: 3,
      status: AbsenceStatus.WAITING_VALIDATION,
      createdAt: new Date('2024-03-01T10:00:00Z'),
      updatedAt: new Date('2024-03-01T10:00:00Z'),
    },
    {
      id: 'absence-2',
      absenceTypeId: 'type-2',
      absenceTypeName: 'Sick Leave',
      startAt: new Date('2024-05-01T09:00:00Z'),
      endAt: new Date('2024-05-03T18:00:00Z'),
      duration: 2,
      status: AbsenceStatus.ACCEPTED,
      createdAt: new Date('2024-03-15T10:00:00Z'),
      updatedAt: new Date('2024-03-15T10:00:00Z'),
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
      findByValidatorId: jest.fn(),
      findAll: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListUserAbsencesHandler,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
      ],
    }).compile();

    handler = module.get<ListUserAbsencesHandler>(ListUserAbsencesHandler);
  });

  it('should return a list of absences for the given user', async () => {
    mockAbsenceRepository.findByUserId.mockResolvedValue(mockAbsenceRows);

    const query = new ListUserAbsencesQuery(userId);
    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(mockAbsenceRepository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should map absence fields to DTO correctly', async () => {
    mockAbsenceRepository.findByUserId.mockResolvedValue([mockAbsenceRows[0]]);

    const query = new ListUserAbsencesQuery(userId);
    const result = await handler.execute(query);

    expect(result[0]).toMatchObject({
      id: 'absence-1',
      absenceTypeId: 'type-1',
      absenceTypeName: 'Annual Leave',
      startAt: '2024-04-10T09:00:00.000Z',
      endAt: '2024-04-12T18:00:00.000Z',
      duration: 3,
      status: AbsenceStatus.WAITING_VALIDATION,
      createdAt: '2024-03-01T10:00:00.000Z',
      updatedAt: '2024-03-01T10:00:00.000Z',
    });
  });

  it('should return an empty array when the user has no absences', async () => {
    mockAbsenceRepository.findByUserId.mockResolvedValue([]);

    const query = new ListUserAbsencesQuery(userId);
    const result = await handler.execute(query);

    expect(result).toEqual([]);
    expect(mockAbsenceRepository.findByUserId).toHaveBeenCalledWith(userId);
  });

  it('should pass userId from the query to the repository', async () => {
    mockAbsenceRepository.findByUserId.mockResolvedValue([]);

    const otherUserId = 'other-user-999';
    const query = new ListUserAbsencesQuery(otherUserId);
    await handler.execute(query);

    expect(mockAbsenceRepository.findByUserId).toHaveBeenCalledWith(otherUserId);
  });
});
