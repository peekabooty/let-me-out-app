import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventBus } from '@nestjs/cqrs';
import { CreateAbsenceHandler } from './create-absence.handler';
import { CreateAbsenceCommand } from './create-absence.command';
import {
  AbsenceRepositoryPort,
  ABSENCE_REPOSITORY_PORT,
} from '../../domain/ports/absence.repository.port';
import {
  AbsenceTypeRepositoryPort,
  ABSENCE_TYPE_REPOSITORY_PORT,
} from '../../../absence-types/domain/ports/absence-type.repository.port';
import { DurationCalculatorService } from '../../domain/services/duration-calculator.service';
import { AnnualLimitValidatorService } from '../../domain/services/annual-limit-validator.service';
import { OverlapValidatorService } from '../../domain/services/overlap-validator.service';
import { ClockService } from '../../../../common';
import { AbsenceUnit, AbsenceStatus } from '@repo/types';
import { AbsenceType } from '../../../absence-types/domain/absence-type.entity';

describe('CreateAbsenceHandler', () => {
  let handler: CreateAbsenceHandler;
  let mockAbsenceRepository: jest.Mocked<AbsenceRepositoryPort>;
  let mockAbsenceTypeRepository: jest.Mocked<AbsenceTypeRepositoryPort>;
  let mockDurationCalculator: jest.Mocked<DurationCalculatorService>;
  let mockAnnualLimitValidator: jest.Mocked<AnnualLimitValidatorService>;
  let mockOverlapValidator: jest.Mocked<OverlapValidatorService>;
  let mockClock: jest.Mocked<ClockService>;
  let mockEventBus: jest.Mocked<EventBus>;

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

    mockAbsenceTypeRepository = {
      findById: jest.fn(),
      findAll: jest.fn(),
      findAllActive: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };

    mockDurationCalculator = {
      calculateDuration: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockAnnualLimitValidator = {
      validateLimit: jest.fn(),
      calculateRemainingBalance: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockOverlapValidator = {
      validate: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockClock = {
      now: jest.fn().mockReturnValue(new Date('2026-03-01T12:00:00Z')),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    mockEventBus = {
      publish: jest.fn(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateAbsenceHandler,
        {
          provide: ABSENCE_REPOSITORY_PORT,
          useValue: mockAbsenceRepository,
        },
        {
          provide: ABSENCE_TYPE_REPOSITORY_PORT,
          useValue: mockAbsenceTypeRepository,
        },
        {
          provide: DurationCalculatorService,
          useValue: mockDurationCalculator,
        },
        {
          provide: AnnualLimitValidatorService,
          useValue: mockAnnualLimitValidator,
        },
        {
          provide: OverlapValidatorService,
          useValue: mockOverlapValidator,
        },
        {
          provide: ClockService,
          useValue: mockClock,
        },
        {
          provide: EventBus,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    handler = module.get<CreateAbsenceHandler>(CreateAbsenceHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('execute', () => {
    const mockAbsenceType = new AbsenceType({
      id: 'type-123',
      name: 'Vacation',
      unit: AbsenceUnit.DAYS,
      isActive: true,
      minDuration: 1,
      maxDuration: 10,
      maxPerYear: 20,
      requiresValidation: true,
      allowPastDates: false,
      minDaysInAdvance: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should throw NotFoundException when absence type does not exist', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'nonexistent-type',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-12T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(null);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Absence type with ID nonexistent-type not found'
      );
    });

    it('should throw BadRequestException when absence type is inactive', async () => {
      // Arrange
      const inactiveAbsenceType = new AbsenceType({
        id: 'type-123',
        name: 'Inactive Type',
        unit: AbsenceUnit.DAYS,
        isActive: false,
        minDuration: 1,
        maxDuration: 10,
        maxPerYear: 20,
        requiresValidation: false,
        allowPastDates: false,
        minDaysInAdvance: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-12T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(inactiveAbsenceType);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'The selected absence type is not active'
      );
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-12T18:00:00Z'),
        new Date('2026-03-10T09:00:00Z') // end before start
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('End date must be after start date');
    });

    it('should throw BadRequestException when duration is below minimum limit', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-10T10:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(0); // Below minimum of 1

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Duration must be between 1 and 10 days'
      );
    });

    it('should throw BadRequestException when duration exceeds maximum limit', async () => {
      // Arrange
      // Use a date far enough in the future to pass the 7-day minDaysInAdvance check
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-15T09:00:00Z'),
        new Date('2026-04-05T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(15); // Above maximum of 10

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'Duration must be between 1 and 10 days'
      );
    });

    it('should throw BadRequestException when annual limit is exceeded', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-15T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(5);
      mockAnnualLimitValidator.validateLimit.mockRejectedValue(
        new BadRequestException('Annual limit exceeded')
      );

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Annual limit exceeded');
    });

    it('should throw BadRequestException when overlap is detected', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-12T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(3);
      mockAnnualLimitValidator.validateLimit.mockResolvedValue();
      mockOverlapValidator.validate.mockRejectedValue(new BadRequestException('Overlap detected'));

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow('Overlap detected');
    });

    it('should create absence without validation flow (status = null, no status history)', async () => {
      // Arrange
      const absenceTypeWithoutValidation = new AbsenceType({
        id: 'type-123',
        name: 'Personal Leave',
        unit: AbsenceUnit.DAYS,
        isActive: true,
        minDuration: 1,
        maxDuration: 5,
        maxPerYear: 10,
        requiresValidation: false,
        allowPastDates: true,
        minDaysInAdvance: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-12T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(absenceTypeWithoutValidation);
      mockDurationCalculator.calculateDuration.mockReturnValue(3);
      mockAnnualLimitValidator.validateLimit.mockResolvedValue();
      mockOverlapValidator.validate.mockResolvedValue();
      mockAbsenceRepository.save.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockAbsenceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          absenceTypeId: 'type-123',
          duration: 3,
          status: null,
        })
      );
      expect(mockAbsenceRepository.createStatusHistory).not.toHaveBeenCalled();
      expect(mockAbsenceRepository.assignValidators).not.toHaveBeenCalled();
    });

    it('should create absence with validation flow (status = WAITING_VALIDATION, status history created)', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-15T18:00:00Z')
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(5);
      mockAnnualLimitValidator.validateLimit.mockResolvedValue();
      mockOverlapValidator.validate.mockResolvedValue();
      mockAbsenceRepository.save.mockResolvedValue();
      mockAbsenceRepository.createStatusHistory.mockResolvedValue();

      // Act
      const result = await handler.execute(command);

      // Assert
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(mockAbsenceRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          absenceTypeId: 'type-123',
          duration: 5,
          status: AbsenceStatus.WAITING_VALIDATION,
        })
      );
      expect(mockAbsenceRepository.createStatusHistory).toHaveBeenCalledWith(
        expect.any(String), // absence ID
        null, // fromStatus
        AbsenceStatus.WAITING_VALIDATION, // toStatus
        'user-123', // changedBy
        expect.any(Date) // changedAt
      );
    });

    it('should persist assigned validators when absence requires validation (RF-23, RF-33)', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-15T18:00:00Z'),
        ['validator-1', 'validator-2']
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(5);
      mockAnnualLimitValidator.validateLimit.mockResolvedValue();
      mockOverlapValidator.validate.mockResolvedValue();
      mockAbsenceRepository.save.mockResolvedValue();
      mockAbsenceRepository.createStatusHistory.mockResolvedValue();
      mockAbsenceRepository.assignValidators.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockAbsenceRepository.assignValidators).toHaveBeenCalledWith(
        expect.any(String), // absence ID
        ['validator-1', 'validator-2'],
        expect.any(Date)
      );
    });

    it('should throw BadRequestException when user assigns themselves as validator (RF-34)', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-15T18:00:00Z'),
        ['user-123', 'validator-2'] // user-123 is the absence owner
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(5);
      mockAnnualLimitValidator.validateLimit.mockResolvedValue();
      mockOverlapValidator.validate.mockResolvedValue();
      mockAbsenceRepository.save.mockResolvedValue();
      mockAbsenceRepository.createStatusHistory.mockResolvedValue();

      // Act & Assert
      await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
      await expect(handler.execute(command)).rejects.toThrow(
        'A user cannot be assigned as a validator for their own absence'
      );
    });

    it('should publish AbsenceCreatedEvent when validators are assigned (RF-47)', async () => {
      // Arrange
      const command = new CreateAbsenceCommand(
        'user-123',
        'type-123',
        new Date('2026-03-10T09:00:00Z'),
        new Date('2026-03-15T18:00:00Z'),
        ['validator-1']
      );

      mockAbsenceTypeRepository.findById.mockResolvedValue(mockAbsenceType);
      mockDurationCalculator.calculateDuration.mockReturnValue(5);
      mockAnnualLimitValidator.validateLimit.mockResolvedValue();
      mockOverlapValidator.validate.mockResolvedValue();
      mockAbsenceRepository.save.mockResolvedValue();
      mockAbsenceRepository.createStatusHistory.mockResolvedValue();
      mockAbsenceRepository.assignValidators.mockResolvedValue();

      // Act
      await handler.execute(command);

      // Assert
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });
});
