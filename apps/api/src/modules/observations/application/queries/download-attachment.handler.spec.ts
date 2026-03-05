import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DownloadAttachmentQuery } from './download-attachment.query';
import { DownloadAttachmentHandler } from './download-attachment.handler';
import type { ObservationAttachmentRepositoryPort } from '../../domain/ports/observation-attachment.repository.port';
import type { FileStoragePort } from '../../domain/ports/file-storage.port';
import type { ObservationRepositoryPort } from '../../domain/ports/observation.repository.port';
import type { AbsenceRepositoryPort } from '../../../absences/domain/ports/absence.repository.port';
import { ObservationAttachment } from '../../domain/observation-attachment.entity';
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
  saveFile: jest.fn(),
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
  findByValidatorId: jest.fn(),
  findAll: jest.fn(),
  ...overrides,
});

const makeAttachment = (overrides: Partial<ObservationAttachment> = {}): ObservationAttachment => {
  return new ObservationAttachment({
    id: 'attachment-id',
    observationId: 'observation-id',
    filename: 'document.pdf',
    storedFilename: 'stored-uuid.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12_345,
    createdAt: NOW,
    ...overrides,
  });
};

const makeObservation = (overrides: Partial<Observation> = {}): Observation => {
  return {
    id: 'observation-id',
    absenceId: 'absence-id',
    userId: 'user-id',
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

describe('DownloadAttachmentHandler', () => {
  it('successfully downloads an attachment when user is the absence creator', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'user-id' });
    const fileBuffer = Buffer.from('PDF file content');

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(fileBuffer),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      fileStorage,
      observationRepo,
      absenceRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');
    const result = await handler.execute(query);

    expect(result.buffer).toEqual(fileBuffer);
    expect(result.filename).toBe('document.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(attachmentRepo.findById).toHaveBeenCalledWith('attachment-id');
    expect(observationRepo.findById).toHaveBeenCalledWith('observation-id');
    expect(absenceRepo.findById).toHaveBeenCalledWith('absence-id');
    expect(fileStorage.getFile).toHaveBeenCalledWith('stored-uuid.pdf');
  });

  it('successfully downloads an attachment when user is an assigned validator', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });
    const fileBuffer = Buffer.from('PDF file content');

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(fileBuffer),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      fileStorage,
      observationRepo,
      absenceRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'validator-id');
    const result = await handler.execute(query);

    expect(result.buffer).toEqual(fileBuffer);
    expect(result.filename).toBe('document.pdf');
  });

  it('throws NotFoundException when attachment does not exist', async () => {
    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      makeObservationRepo(),
      makeAbsenceRepo()
    );

    const query = new DownloadAttachmentQuery('non-existent-attachment-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Attachment with ID non-existent-attachment-id not found'
    );
  });

  it('throws NotFoundException when observation does not exist', async () => {
    const attachment = makeAttachment();
    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      observationRepo,
      makeAbsenceRepo()
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Observation with ID observation-id not found'
    );
  });

  it('throws NotFoundException when absence does not exist', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ absenceId: 'absence-id' });
    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      observationRepo,
      absenceRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow('Absence with ID absence-id not found');
  });

  it('throws ForbiddenException when user is neither creator nor validator', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      observationRepo,
      absenceRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'uninvolved-user-id');

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(query)).rejects.toThrow(
      'You do not have permission to download this attachment'
    );
  });

  it('successfully downloads a PNG image attachment', async () => {
    const attachment = makeAttachment({
      filename: 'photo.png',
      storedFilename: 'stored-uuid.png',
      mimeType: 'image/png',
    });
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'user-id' });
    const imageBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(imageBuffer),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      fileStorage,
      observationRepo,
      absenceRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');
    const result = await handler.execute(query);

    expect(result.filename).toBe('photo.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.buffer).toEqual(imageBuffer);
  });

  it('throws NotFoundException when file storage returns null', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'user-id' });

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(null),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      fileStorage,
      observationRepo,
      absenceRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'File for attachment attachment-id not found in storage'
    );
  });
});
