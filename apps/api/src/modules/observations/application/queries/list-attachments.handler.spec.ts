import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ListAttachmentsQuery } from './list-attachments.query';
import { ListAttachmentsHandler } from './list-attachments.handler';
import type { ObservationAttachmentRepositoryPort } from '../../domain/ports/observation-attachment.repository.port';
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
  findByObservationId: jest.fn().mockResolvedValue([]),
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

const makeAttachment = (overrides: Partial<ObservationAttachment> = {}): ObservationAttachment =>
  new ObservationAttachment({
    id: 'attachment-id',
    observationId: 'observation-id',
    filename: 'document.pdf',
    storedFilename: 'stored-uuid.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 12_345,
    createdAt: NOW,
    ...overrides,
  });

describe('ListAttachmentsHandler', () => {
  it('successfully lists attachments when user is the absence creator', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'user-id' });
    const attachment1 = makeAttachment({ id: 'att-1', filename: 'doc1.pdf' });
    const attachment2 = makeAttachment({
      id: 'att-2',
      filename: 'photo.png',
      mimeType: 'image/png',
    });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const attachmentRepo = makeAttachmentRepo({
      findByObservationId: jest.fn().mockResolvedValue([attachment1, attachment2]),
    });

    const handler = new ListAttachmentsHandler(attachmentRepo, observationRepo, absenceRepo);
    const query = new ListAttachmentsQuery('observation-id', 'user-id');

    const result = await handler.execute(query);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('att-1');
    expect(result[0].filename).toBe('doc1.pdf');
    expect(result[1].id).toBe('att-2');
    expect(result[1].filename).toBe('photo.png');
    expect(observationRepo.findById).toHaveBeenCalledWith('observation-id');
    expect(absenceRepo.findById).toHaveBeenCalledWith('absence-id');
    expect(attachmentRepo.findByObservationId).toHaveBeenCalledWith('observation-id');
  });

  it('successfully lists attachments when user is an assigned validator', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'creator-id' });
    const attachment = makeAttachment({ id: 'att-1' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue(['validator-id']),
    });
    const attachmentRepo = makeAttachmentRepo({
      findByObservationId: jest.fn().mockResolvedValue([attachment]),
    });

    const handler = new ListAttachmentsHandler(attachmentRepo, observationRepo, absenceRepo);
    const query = new ListAttachmentsQuery('observation-id', 'validator-id');

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('att-1');
  });

  it('throws NotFoundException when observation does not exist', async () => {
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new ListAttachmentsHandler(
      makeAttachmentRepo(),
      observationRepo,
      makeAbsenceRepo()
    );

    const query = new ListAttachmentsQuery('non-existent-observation-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow(
      'Observation with ID non-existent-observation-id not found'
    );
  });

  it('throws NotFoundException when absence does not exist', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(null),
    });

    const handler = new ListAttachmentsHandler(makeAttachmentRepo(), observationRepo, absenceRepo);

    const query = new ListAttachmentsQuery('observation-id', 'user-id');

    await expect(handler.execute(query)).rejects.toThrow(NotFoundException);
    await expect(handler.execute(query)).rejects.toThrow('Absence with ID absence-id not found');
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

    const handler = new ListAttachmentsHandler(makeAttachmentRepo(), observationRepo, absenceRepo);

    const query = new ListAttachmentsQuery('observation-id', 'uninvolved-user-id');

    await expect(handler.execute(query)).rejects.toThrow(ForbiddenException);
    await expect(handler.execute(query)).rejects.toThrow(
      'You do not have permission to view attachments for this observation'
    );
  });

  it('returns empty array when observation has no attachments', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'user-id' });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const attachmentRepo = makeAttachmentRepo({
      findByObservationId: jest.fn().mockResolvedValue([]),
    });

    const handler = new ListAttachmentsHandler(attachmentRepo, observationRepo, absenceRepo);
    const query = new ListAttachmentsQuery('observation-id', 'user-id');

    const result = await handler.execute(query);

    expect(result).toEqual([]);
    expect(attachmentRepo.findByObservationId).toHaveBeenCalledWith('observation-id');
  });

  it('maps attachments to AttachmentResponseDto', async () => {
    const observation = makeObservation({ absenceId: 'absence-id' });
    const absence = makeAbsence({ userId: 'user-id' });
    const attachment = makeAttachment({
      id: 'att-1',
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 54_321,
    });

    const observationRepo = makeObservationRepo({
      findById: jest.fn().mockResolvedValue(observation),
    });
    const absenceRepo = makeAbsenceRepo({
      findById: jest.fn().mockResolvedValue(absence),
      getAssignedValidators: jest.fn().mockResolvedValue([]),
    });
    const attachmentRepo = makeAttachmentRepo({
      findByObservationId: jest.fn().mockResolvedValue([attachment]),
    });

    const handler = new ListAttachmentsHandler(attachmentRepo, observationRepo, absenceRepo);
    const query = new ListAttachmentsQuery('observation-id', 'user-id');

    const result = await handler.execute(query);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('att-1');
    expect(result[0].observationId).toBe('observation-id');
    expect(result[0].filename).toBe('report.pdf');
    expect(result[0].mimeType).toBe('application/pdf');
    expect(result[0].sizeBytes).toBe(54_321);
  });
});
