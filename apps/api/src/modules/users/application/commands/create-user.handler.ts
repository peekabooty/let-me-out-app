import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as bcrypt from 'bcrypt';

import { ClockService, generateId } from '../../../../common';
import { User } from '../../domain/user.entity';
import { USER_REPOSITORY_PORT, UserRepositoryPort } from '../../domain/ports/user.repository.port';
import { CreateUserCommand } from './create-user.command';

const BCRYPT_COST = 12;

@Injectable()
@CommandHandler(CreateUserCommand)
export class CreateUserHandler implements ICommandHandler<CreateUserCommand, string> {
  constructor(
    @Inject(USER_REPOSITORY_PORT)
    private readonly userRepository: UserRepositoryPort,
    private readonly clock: ClockService
  ) {}

  async execute(command: CreateUserCommand): Promise<string> {
    const existing = await this.userRepository.findByEmail(command.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const now = this.clock.now();
    const passwordHash = await bcrypt.hash(command.password, BCRYPT_COST);

    const user = new User({
      id: generateId(),
      email: command.email,
      name: command.name,
      passwordHash,
      role: command.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await this.userRepository.save(user);

    return user.id;
  }
}
