import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { uuidv7 } from 'uuidv7';

import { ClockService } from '../../../../common';
import {
  FILE_STORAGE_PORT,
  FileStoragePort,
} from '../../../observations/domain/ports/file-storage.port';
import { FileValidationService } from '../../../observations/domain/services/file-validation.service';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UpdateUserAvatarCommand } from './update-user-avatar.command';

export interface UpdateUserAvatarResult {
  avatarUrl: string;
}

@Injectable()
@CommandHandler(UpdateUserAvatarCommand)
export class UpdateUserAvatarHandler implements ICommandHandler<
  UpdateUserAvatarCommand,
  UpdateUserAvatarResult
> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject(FILE_STORAGE_PORT)
    private readonly fileStorage: FileStoragePort,
    private readonly fileValidationService: FileValidationService,
    private readonly clock: ClockService
  ) {}

  async execute(command: UpdateUserAvatarCommand): Promise<UpdateUserAvatarResult> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const mimeType = await this.fileValidationService.validateFile(
      command.buffer,
      command.originalFilename
    );
    if (mimeType !== 'image/jpeg' && mimeType !== 'image/png') {
      throw new BadRequestException(
        `File "${command.originalFilename}" has type "${mimeType}" which is not allowed. Allowed types: JPEG, PNG`
      );
    }

    const extension = this.fileValidationService.getExtensionForMimeType(mimeType);
    const storedFilename = `${uuidv7()}.${extension}`;
    await this.fileStorage.saveFile(command.buffer, storedFilename);

    const previousStoredFilename = user.avatarUrl;
    const updatedUser = user.changeAvatarUrl(storedFilename, this.clock.now());
    await this.userRepository.update(updatedUser);

    if (previousStoredFilename) {
      try {
        await this.fileStorage.deleteFile(previousStoredFilename);
      } catch {
        // Ignore deletion errors for previous avatars.
      }
    }

    return { avatarUrl: `/users/${user.id}/avatar` };
  }
}
