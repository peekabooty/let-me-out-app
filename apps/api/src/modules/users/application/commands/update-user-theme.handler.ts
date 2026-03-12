import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { ClockService } from '../../../../common';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { UpdateUserThemeCommand } from './update-user-theme.command';

@Injectable()
@CommandHandler(UpdateUserThemeCommand)
export class UpdateUserThemeHandler implements ICommandHandler<UpdateUserThemeCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: UpdateUserThemeCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updatedUser = user.changeThemePreference(command.theme, this.clock.now());
    await this.userRepository.update(updatedUser);
  }
}
