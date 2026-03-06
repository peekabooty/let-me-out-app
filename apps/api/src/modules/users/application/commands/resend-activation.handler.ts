import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { ClockService } from '../../../../common';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { EmailServicePort } from '../../../notifications/domain/ports/email-service.port';
import { EmailTemplateService } from '../../../notifications/domain/services/email-template.service';
import { ResendActivationCommand } from './resend-activation.command';

const ACTIVATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

@Injectable()
@CommandHandler(ResendActivationCommand)
export class ResendActivationHandler implements ICommandHandler<ResendActivationCommand, void> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject('EmailServicePort')
    private readonly emailService: EmailServicePort,
    private readonly clock: ClockService,
    private readonly configService: ConfigService,
    private readonly emailTemplateService: EmailTemplateService
  ) {}

  async execute(command: ResendActivationCommand): Promise<void> {
    const user = await this.userRepository.findById(command.userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isActive) {
      throw new BadRequestException('User account is already active');
    }

    const now = this.clock.now();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(now.getTime() + ACTIVATION_TOKEN_TTL_MS);

    const updatedUser = user.generateActivationToken(tokenHash, tokenExpiresAt, now);
    await this.userRepository.update(updatedUser);

    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const activationUrl = `${appUrl}/activate?token=${rawToken}`;
    const htmlBody = this.emailTemplateService.generateActivationEmail(user.name, activationUrl);

    await this.emailService.sendEmail(user.email, 'Activa tu cuenta en Let Me Out', htmlBody);
  }
}
