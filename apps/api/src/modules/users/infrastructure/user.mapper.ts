import { Injectable } from '@nestjs/common';
import type { user as PrismaUser } from '@prisma/client';
import { Theme, UserRole } from '@repo/types';

import { User } from '../domain/user.entity';
import type { UserResponseDto } from '../application/dtos/user-response.dto';
import type { UserProfileDto } from '../application/dtos/user-profile.dto';

@Injectable()
export class UserMapper {
  toDomain(prismaUser: PrismaUser): User {
    return new User({
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      passwordHash: prismaUser.password_hash,
      role: prismaUser.role as UserRole,
      isActive: prismaUser.is_active,
      themePreference: (prismaUser.theme_preference as Theme | null) ?? null,
      activationTokenHash: prismaUser.activation_token_hash,
      activationTokenExpiresAt: prismaUser.activation_token_expires_at,
      createdAt: prismaUser.created_at,
      updatedAt: prismaUser.updated_at,
    });
  }

  toResponseDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      themePreference: user.themePreference,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      themePreference: user.themePreference,
    };
  }
}
