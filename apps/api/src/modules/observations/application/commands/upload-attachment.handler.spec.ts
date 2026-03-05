import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UploadAttachmentCommand } from './upload-attachment.command';
import { UploadAttachmentHandler } from './upload-attachment.handler';
import type { ObservationAttachmentRepositoryPort } from '../../domain/ports/observation-attachment.repository.port';
import type { FileStoragePort } from '../../domain/ports/file-storage.port';
import type { ObservationRepositoryPort } from '../../domain/ports/observation.repository.port';
import type { AbsenceRepositoryPort } from '../../../absences/domain/ports/absence.repository.port';
import { FileValidationService } from '../../domain/services/file-validation.service';
import { ClockService } from '../../../../common/clock/clock.service';
import { Observation } from '../../domain/observation.entity';
import { Absence } from '../../../absences/domain/absence.entity';
import { AbsenceStatus } from '@repo/types';

const NOW = new Date('2026-03-03T10:00:00.000Z');

const makeAttachmentRepo = (
  overrides: Partial<ObservationAttachmentRepositoryPort> = {}
): ObservationAttachmentRepositoryPort => ({
  save: jest.fn(),
  findById: jest.fn(),
  findByObservationId: jest.fn(),
  ...overrides,
});

const makeFileStorage = (overrides: Partial<FileStoragePort> = {}): FileStoragePort => ({
  saveFile: jest.fn().mockResolvedValue('/uploads/file.pdf'),
  getFile: jest.fn(),
  deleteFile: jest.fn(),
  ...overrides,
});

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
  ...overrides,
});

const makeFileValidationService = (): FileValidationService =>
  ({
    validateFile: jest.fn(),
    getExtensionForMimeType: jest.fn(),
  }) as unknown as FileValidationService;

const makeClockService = (): ClockService =>
  ({
    now: jest.fn().mockReturnValue(NOW),
  }) as unknown as ClockService;

const makeObservation = (overrides: Partial<Observation> = {}): Observation => {
  return {
    id: 'observation-id',
    absenceId: 'absence-id',
    userId: 'creator-id',
    content: 'Test observation',
    createdAt: NOW,
    ...overrides,
  } as Observation;
};

const makeAbsence = (overrides: Partial<Absence> = {}): Absence =>
  new Absence({
    id: 'absence-id',
    userId: 'creator-id',
    absenceTypeId: 'type-id',
    startAt: new Date('2026-04-01'),
    endAt: new Date('2026-04-05'),
    duration: 5,
    status: AbsenceStatus.WAITING_VALIDATION,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

// Mock uuidv7
jest.mock('uuidv7', () => ({
  uuidv7: jest.fn(() => 'generated-uuid-v7'),
}));

describe('UploadAttachmentHandler', () => {
  it('successfully uploads a valid PDF file when user is the absence creator', async () => {
    const observation = makeObservation({ userId: 'creator-id', absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });

    const pdfBuffer = Buffer.from('%PDF-1.4');
    const attachmentRepo = makeAttachmentRepo();
    const fileStorage = makeFileStorage();
    const fileValidation = makeFileValidationService();
    (fileValidation.validateFile as jest.Mock).mockResolvedValue('application/pdf');
    (fileValidation.getExtensionForMimeType as jest.Mock).mockReturnValue('pdf');
    const clock = makeClockService();

    const handler = new UploadAttachmentHandler(
      attachmentRepo,
      fileStorage,
      observationRepo,
      absenceRepo,
      fileValidation,
      clock
    );

    const command = new UploadAttachmentCommand(
      'observation-id',
      'document.pdf',
      pdfBuffer,
      'creator-id'
    );

    const result = await handler.execute(command);

    expect(result.id).toBe('generated-uuid-v7');
    expect(result.observationId).toBe('observation-id');
    expect(result.filename).toBe('document.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.sizeBytes).toBe(pdfBuffer.length);
    expect(fileStorage.saveFile).toHaveBeenCalledWith(pdfBuffer, 'generated-uuid-v7.pdf');
    expect(attachmentRepo.save).toHaveBeenCalledTimes(1);
  });

  it('successfully uploads when user is an assigned validator', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });

    const fileValidation = makeFileValidationService();
    (fileValidation.validateFile as jest.Mock).mockResolvedValue('image/jpeg');
    (fileValidation.getExtensionForMimeType as jest.Mock).mockReturnValue('jpg');

    const handler = new UploadAttachmentHandler(
      makeAttachmentRepo(),
      makeFileStorage(),
      observationRepo,
      absenceRepo,
      fileValidation,
      makeClockService()
    );

    const command = new UploadAttachmentCommand(
      'observation-id',
      'photo.jpg',
      Buffer.from([0xFF, 0xD8, 0xFF]),
      'validator-id'
    );

    const result = await handler.execute(command);

    expect(result.mimeType).toBe('image/jpeg');
  });

  it('throws NotFoundException when observation does not exist', async () => {
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new UploadAttachmentHandler(
      makeAttachmentRepo(),
      makeFileStorage(),
      observationRepo,
      makeAbsenceRepo(),
      makeFileValidationService(),
      makeClockService()
    );

    const command = new UploadAttachmentCommand(
      'non-existent-observation-id',
      'file.pdf',
      Buffer.from('test'),
      'user-id'
    );

    await expect(handler.execute(command)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Observation with ID non-existent-observation-id not found'
    );
  });

  it('throws ForbiddenException when user is neither creator nor validator', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });

    const handler = new UploadAttachmentHandler(
      makeAttachmentRepo(),
      makeFileStorage(),
      observationRepo,
      absenceRepo,
      makeFileValidationService(),
      makeClockService()
    );

    const command = new UploadAttachmentCommand(
      'observation-id',
      'file.pdf',
      Buffer.from('test'),
      'uninvolved-user-id'
    );

    await expect(handler.execute(command)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(command)).rejects.toThrow(
      'You do not have permission to upload attachments to this observation'
    );
  });

  it('throws BadRequestException when file validation fails', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });

    const fileValidation = makeFileValidationService();
    (fileValidation.validateFile as jest.Mock).mockRejectedValue(
      new BadRequestException('File size exceeds the maximum limit of 5 MB')
    );

    const handler = new UploadAttachmentHandler(
      makeAttachmentRepo(),
      makeFileStorage(),
      observationRepo,
      absenceRepo,
      fileValidation,
      makeClockService()
    );

    const command = new UploadAttachmentCommand(
      'observation-id',
      'large-file.pdf',
      Buffer.alloc(6 * 1024 * 1024),
      'creator-id'
    );

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'File size exceeds the maximum limit of 5 MB'
    );
  });

  it('throws BadRequestException when file has unsupported MIME type', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });

    const fileValidation = makeFileValidationService();
    (fileValidation.validateFile as jest.Mock).mockRejectedValue(
      new BadRequestException('Only JPEG, PNG, and PDF files are allowed')
    );

    const handler = new UploadAttachmentHandler(
      makeAttachmentRepo(),
      makeFileStorage(),
      observationRepo,
      absenceRepo,
      fileValidation,
      makeClockService()
    );

    const command = new UploadAttachmentCommand(
      'observation-id',
      'document.txt',
      Buffer.from('plain text'),
      'creator-id'
    );

    await expect(handler.execute(command)).rejects.toThrow(BadRequestException);
    await expect(handler.execute(command)).rejects.toThrow(
      'Only JPEG, PNG, and PDF files are allowed'
    );
  });
});
