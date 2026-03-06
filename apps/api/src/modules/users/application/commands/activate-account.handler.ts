import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { ClockService } from '../../../../common';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { ActivateAccountCommand } from './activate-account.command';

const BCRYPT_COST = 12;

@Injectable()
@CommandHandler(ActivateAccountCommand)
export class ActivateAccountHandler implements ICommandHandler<ActivateAccountCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: ActivateAccountCommand): Promise<void> {
    const tokenHash = crypto.createHash('sha256').update(command.token).digest('hex');
    const user = await this.userRepository.findByActivationTokenHash(tokenHash);

    if (!user) {
      throw new NotFoundException('Activation token not found or already used');
    }

    const now = this.clock.now();

    if (!user.activationTokenExpiresAt || user.activationTokenExpiresAt < now) {
      throw new BadRequestException('Activation token has expired');
    }

    const passwordHash = await bcrypt.hash(command.password, BCRYPT_COST);
    const activatedUser = user.activateWithPassword(passwordHash, now);

    await this.userRepository.update(activatedUser);
  }
}
