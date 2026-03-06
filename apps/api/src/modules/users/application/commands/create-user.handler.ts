import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

import { ClockService, generateId } from '../../../../common';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { EmailServicePort } from '../../../notifications/domain/ports/email-service.port';
import { EmailTemplateService } from '../../../notifications/domain/services/email-template.service';
import { CreateUserCommand } from './create-user.command';

const ACTIVATION_TOKEN_TTL_MS = 48 * 60 * 60 * 1000;

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, string> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    @Inject('EmailServicePort')
    private readonly emailService: EmailServicePort,
    private readonly clock: ClockService,
    private readonly configService: ConfigService,
    private readonly emailTemplateService: EmailTemplateService
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const now = this.clock.now();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const tokenExpiresAt = new Date(now.getTime() + ACTIVATION_TOKEN_TTL_MS);

    const user = new User({
      id: generateId(),
      email: command.email,
      name: command.name,
      passwordHash: null,
      role: command.role,
      isActive: false,
      activationTokenHash: tokenHash,
      activationTokenExpiresAt: tokenExpiresAt,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepository.save(user);

    const appUrl = this.configService.getOrThrow<string>('APP_URL');
    const activationUrl = `${appUrl}/activate?token=${rawToken}`;
    const htmlBody = this.emailTemplateService.generateActivationEmail(user.name, activationUrl);

    await this.emailService.sendEmail(user.email, 'Activa tu cuenta en Let Me Out', htmlBody);

    return user.id;
  }
}
