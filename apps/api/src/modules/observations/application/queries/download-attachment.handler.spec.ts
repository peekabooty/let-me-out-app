import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DownloadAttachmentQuery } from './download-attachment.query';
import { DownloadAttachmentHandler } from './download-attachment.handler';
import type { ObservationAttachmentRepositoryPort } from '../../domain/ports/observation-attachment.repository.port';
import type { FileStoragePort } from '../../domain/ports/file-storage.port';
import type { ObservationRepositoryPort } from '../../domain/ports/observation.repository.port';
import { ObservationAttachment } from '../../domain/observation-attachment.entity';
import { Observation } from '../../domain/observation.entity';

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

describe('DownloadAttachmentHandler', () => {
  it('successfully downloads an attachment when user has permission', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ userId: 'user-id' });
    const fileBuffer = Buffer.from('PDF file content');

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([observation]),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(fileBuffer),
    });

    const handler = new DownloadAttachmentHandler(attachmentRepo, fileStorage, observationRepo);

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');
    const result = await handler.execute(query);

    expect(result.buffer).toEqual(fileBuffer);
    expect(result.filename).toBe('document.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(attachmentRepo.findById).toHaveBeenCalledWith('attachment-id');
    expect(fileStorage.getFile).toHaveBeenCalledWith('stored-uuid.pdf');
  });

  it('throws NotFoundException when attachment does not exist', async () => {
    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      makeObservationRepo()
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
      findByAbsenceId: jest.fn().mockResolvedValue([]),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      observationRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Observation with ID observation-id not found'
    );
  });

  it('throws ForbiddenException when user is not the observation creator', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ userId: 'other-user-id' });

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([observation]),
    });

    const handler = new DownloadAttachmentHandler(
      attachmentRepo,
      makeFileStorage(),
      observationRepo
    );

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');

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
    const observation = makeObservation({ userId: 'user-id' });
    const imageBuffer = Buffer.from([0x89, 0x50, 0x4E, 0x47]);

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([observation]),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(imageBuffer),
    });

    const handler = new DownloadAttachmentHandler(attachmentRepo, fileStorage, observationRepo);

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');
    const result = await handler.execute(query);

    expect(result.filename).toBe('photo.png');
    expect(result.mimeType).toBe('image/png');
    expect(result.buffer).toEqual(imageBuffer);
  });

  it('throws NotFoundException when file storage returns null', async () => {
    const attachment = makeAttachment();
    const observation = makeObservation({ userId: 'user-id' });

    const attachmentRepo = makeAttachmentRepo({
      findById: jest.fn().mockResolvedValue(attachment),
    });
    const observationRepo = makeObservationRepo({
      findByAbsenceId: jest.fn().mockResolvedValue([observation]),
    });
    const fileStorage = makeFileStorage({
      getFile: jest.fn().mockResolvedValue(null),
    });

    const handler = new DownloadAttachmentHandler(attachmentRepo, fileStorage, observationRepo);

    const query = new DownloadAttachmentQuery('attachment-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'File for attachment attachment-id not found in storage'
    );
  });
});
