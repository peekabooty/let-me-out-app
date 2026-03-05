import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { AbsenceStatus } from '@repo/types';

import { ClockService } from '../../../../common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import { AbsenceStateMachineService } from '../../domain/services/absence-state-machine.service';
import { DiscardAbsenceHandler } from './discard-absence.handler';
import { DiscardAbsenceCommand } from './discard-absence.command';
import { Absence } from '../../domain/absence.entity';

describe('DiscardAbsenceHandler', () => {
  let handler: DiscardAbsenceHandler;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;
  let mockPrismaService: jest.Mocked<PrismaService>;
  let mockClockService: jest.Mocked<ClockService>;

  const now = new Date('2024-03-15T10:00:00Z');
  const futureDate = new Date('2024-04-01T09:00:00Z');
  const absenceId = 'absence-123';
  const userId = 'user-456';
  const otherUserId = 'user-789';

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

    mockClockService = {
      now: jest.fn().mockReturnValue(now),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockPrismaService = {
      $transaction: jest.fn((callback) => callback(mockPrismaService)),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DiscardAbsenceHandler,
        AbsenceStateMachineService,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
        {
          provide: ClockService,
          useValue: mockClockService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EventBus,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    handler = module.get<DiscardAbsenceHandler>(DiscardAbsenceHandler);
  });

  describe('RF-31: Discard absence from RECONSIDER state', () => {
    it('should successfully transition absence to DISCARDED', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.RECONSIDER,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new DiscardAbsenceCommand(absenceId, userId);
      await handler.execute(command);

      expect(mockAbsenceRepository.update).toHaveBeenCalledWith(
        expect.objectContaining({
          id: absenceId,
          status: AbsenceStatus.DISCARDED,
        })
      );

      expect(mockAbsenceRepository.createStatusHistory).toHaveBeenCalledWith(
        absenceId,
        AbsenceStatus.RECONSIDER,
        AbsenceStatus.DISCARDED,
        userId,
        now
      );
    });

    it('should throw NotFoundException when absence does not exist', async () => {
      mockAbsenceRepository.findById.mockResolvedValue(null);

      const command = new DiscardAbsenceCommand(absenceId, userId);

      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the absence creator', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.RECONSIDER,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new DiscardAbsenceCommand(absenceId, otherUserId);

      await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Only the absence creator can discard it'
      );
    });

    it('should throw BadRequestException when absence is not in RECONSIDER state', async () => {
      const absence = new Absence({
        id: absenceId,
        userId,
        absenceTypeId: 'type-123',
        startAt: futureDate,
        endAt: new Date('2024-04-05T18:00:00Z'),
        duration: 5,
        status: AbsenceStatus.WAITING_VALIDATION,
        createdAt: new Date('2024-03-01T10:00:00Z'),
        updatedAt: new Date('2024-03-01T10:00:00Z'),
      });

      mockAbsenceRepository.findById.mockResolvedValue(absence);

      const command = new DiscardAbsenceCommand(absenceId, userId);

      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        `Only absences in RECONSIDER state can be discarded. Current status: ${AbsenceStatus.WAITING_VALIDATION}`
      );
    });

    it('should confirm DISCARDED is a final state (RF-32)', () => {
      const stateMachine = new AbsenceStateMachineService();

      expect(stateMachine.isFinalState(AbsenceStatus.DISCARDED)).toBe(true);
      expect(
        stateMachine.isTransitionValid(AbsenceStatus.DISCARDED, AbsenceStatus.WAITING_VALIDATION)
      ).toBe(false);
    });
  });
});
