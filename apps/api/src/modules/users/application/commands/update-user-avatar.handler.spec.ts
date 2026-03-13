import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import { ClockService } from '../../../../common';
import { FileStoragePort } from '../../../observations/domain/ports/file-storage.port';
import { FileValidationService } from '../../../observations/domain/services/file-validation.service';
import { User } from '../../domain/user.entity';
import type { UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UpdateUserAvatarCommand } from './update-user-avatar.command';
import { UpdateUserAvatarHandler } from './update-user-avatar.handler';

const NOW = new Date('2026-03-13T10:00:00.000Z');

const makeUser = (overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User =>
  new User({
    id: '0195a000-0000-7000-8000-000000000001',
    email: 'user@test.com',
    name: 'Test User',
    passwordHash: 'hash',
    role: UserRole.STANDARD,
    isActive: true,
    themePreference: null,
    avatarUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  });

const makeRepo = (user: User | null): UserRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(user),
  findByEmail: jest.fn(),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  save: jest.fn(),
  update: jest.fn().mockResolvedValue(),
});

const makeStorage = (): FileStoragePort => ({
  saveFile: jest.fn().mockResolvedValue('/tmp/avatar.jpg'),
  getFile: jest.fn(),
  deleteFile: jest.fn().mockResolvedValue(),
});

const makeValidation = (): FileValidationService =>
  ({
    validateFile: jest.fn().mockResolvedValue('image/jpeg'),
    getExtensionForMimeType: jest.fn().mockReturnValue('jpg'),
  }) as unknown as FileValidationService;

describe('UpdateUserAvatarHandler', () => {
  it('stores new avatar and updates user avatarUrl', async () => {
    const repo = makeRepo(makeUser());
    const storage = makeStorage();
    const validation = makeValidation();
    const clock = { now: () => NOW } as ClockService;
    const handler = new UpdateUserAvatarHandler(repo, storage, validation, clock);

    const result = await handler.execute(
      new UpdateUserAvatarCommand(
        '0195a000-0000-7000-8000-000000000001',
        'avatar.jpg',
        Buffer.from('a')
      )
    );

    expect(validation.validateFile).toHaveBeenCalled();
    expect(storage.saveFile).toHaveBeenCalled();
    const updatedUser = (repo.update as jest.Mock).mock.calls[0][0] as User;
    expect(updatedUser.avatarUrl).toMatch(/\.jpg$/);
    expect(result.avatarUrl).toBe('/users/0195a000-0000-7000-8000-000000000001/avatar');
  });

  it('deletes previous avatar when user already had one', async () => {
    const repo = makeRepo(makeUser({ avatarUrl: 'old.jpg' }));
    const storage = makeStorage();
    const validation = makeValidation();
    const handler = new UpdateUserAvatarHandler(repo, storage, validation, {
      now: () => NOW,
    } as ClockService);

    await handler.execute(
      new UpdateUserAvatarCommand(
        '0195a000-0000-7000-8000-000000000001',
        'avatar.jpg',
        Buffer.from('a')
      )
    );

    expect(storage.deleteFile).toHaveBeenCalledWith('old.jpg');
  });

  it('throws NotFoundException when user does not exist', async () => {
    const repo = makeRepo(null);
    const storage = makeStorage();
    const validation = makeValidation();
    const handler = new UpdateUserAvatarHandler(repo, storage, validation, {
      now: () => NOW,
    } as ClockService);

    await expect(
      handler.execute(new UpdateUserAvatarCommand('missing', 'avatar.jpg', Buffer.from('a')))
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when file is not image', async () => {
    const repo = makeRepo(makeUser());
    const storage = makeStorage();
    const validation = {
      validateFile: jest.fn().mockResolvedValue('application/pdf'),
      getExtensionForMimeType: jest.fn(),
    } as unknown as FileValidationService;
    const handler = new UpdateUserAvatarHandler(repo, storage, validation, {
      now: () => NOW,
    } as ClockService);

    await expect(
      handler.execute(
        new UpdateUserAvatarCommand(
          '0195a000-0000-7000-8000-000000000001',
          'avatar.pdf',
          Buffer.from('a')
        )
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
