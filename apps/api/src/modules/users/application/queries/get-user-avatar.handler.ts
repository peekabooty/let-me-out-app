import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from '../../../observations/domain/ports/file-storage.port';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { GetUserAvatarQuery } from './get-user-avatar.query';

export interface UserAvatarResult {
  buffer: Buffer;
  mimeType: string;
}

@QueryHandler(GetUserAvatarQuery)
export class GetUserAvatarHandler implements IQueryHandler<GetUserAvatarQuery, UserAvatarResult> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort
  ) {}

  async execute(query: GetUserAvatarQuery): Promise<UserAvatarResult> {
    const user = await this.userRepository.findById(query.userId);
    if (!user?.avatarUrl) {
      throw new NotFoundException('Avatar not found');
    }

    const storedFilename = user.avatarUrl;
    const file = await this.fileStorage.getFile(storedFilename);
    if (!file) {
      throw new NotFoundException('Avatar file not found');
    }

    const mimeType = storedFilename.endsWith('.png') ? 'image/png' : 'image/jpeg';
    return { buffer: file, mimeType };
  }
}
