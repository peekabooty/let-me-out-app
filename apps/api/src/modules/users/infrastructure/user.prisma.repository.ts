import { Injectable } from '@nestjs/common';

import { PrismaService } from '../../../prisma/prisma.service';
import { User } from '../domain/user.entity';
import type { UserRepositoryPort } from '../domain/ports/user.repository.port';
import { UserMapper } from './user.mapper';

@Injectable()
export class UserPrismaRepository implements UserRepositoryPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: UserMapper
  ) {}

  async findById(id: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { id } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const record = await this.prisma.user.findUnique({ where: { email } });
    return record ? this.mapper.toDomain(record) : null;
  }

  async findAll(): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      orderBy: { created_at: 'asc' },
    });
    return records.map((r) => this.mapper.toDomain(r));
  }

  async save(user: User): Promise<void> {
    await this.prisma.user.create({
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        password_hash: user.passwordHash,
        role: user.role,
        is_active: user.isActive,
        created_at: user.createdAt,
        updated_at: user.updatedAt,
      },
    });
  }

  async update(user: User): Promise<void> {
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.email,
        name: user.name,
        password_hash: user.passwordHash,
        role: user.role,
        is_active: user.isActive,
        updated_at: user.updatedAt,
      },
    });
  }
}
