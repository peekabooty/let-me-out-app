import type { user as PrismaUser } from '@prisma/client';
import { UserRole } from '@repo/types';

import { User } from '../domain/user.entity';
import { UserMapper } from './user.mapper';

const BASE_DATE = new Date('2026-01-01T10:00:00.000Z');

const PRISMA_USER: PrismaUser = {
  id: '01950000-0000-7000-0000-000000000001',
  email: 'ana@example.com',
  name: 'Ana García',
  password_hash: '$2b$12$hashedpassword',
  role: 'standard',
  is_active: true,
  activation_token_hash: null,
  activation_token_expires_at: null,
  created_at: BASE_DATE,
  updated_at: BASE_DATE,
};

const DOMAIN_USER = new User({
  id: PRISMA_USER.id,
  email: PRISMA_USER.email,
  name: PRISMA_USER.name,
  passwordHash: PRISMA_USER.password_hash,
  role: UserRole.STANDARD,
  isActive: PRISMA_USER.is_active,
  createdAt: BASE_DATE,
  updatedAt: BASE_DATE,
});

describe('UserMapper', () => {
  const mapper = new UserMapper();

  describe('toDomain', () => {
    it('maps all Prisma fields to domain entity correctly', () => {
      const user = mapper.toDomain(PRISMA_USER);

      expect(user.id).toBe(PRISMA_USER.id);
      expect(user.email).toBe(PRISMA_USER.email);
      expect(user.name).toBe(PRISMA_USER.name);
      expect(user.passwordHash).toBe(PRISMA_USER.password_hash);
      expect(user.role).toBe(UserRole.STANDARD);
      expect(user.isActive).toBe(PRISMA_USER.is_active);
      expect(user.activationTokenHash).toBeNull();
      expect(user.activationTokenExpiresAt).toBeNull();
      expect(user.createdAt).toBe(BASE_DATE);
      expect(user.updatedAt).toBe(BASE_DATE);
    });

    it('maps activation token fields when present', () => {
      const tokenDate = new Date('2026-02-01T10:00:00.000Z');
      const user = mapper.toDomain({
        ...PRISMA_USER,
        activation_token_hash: 'abc123hash',
        activation_token_expires_at: tokenDate,
      });
      expect(user.activationTokenHash).toBe('abc123hash');
      expect(user.activationTokenExpiresAt).toBe(tokenDate);
    });

    it('maps admin role correctly', () => {
      const user = mapper.toDomain({ ...PRISMA_USER, role: 'admin' });
      expect(user.role).toBe(UserRole.ADMIN);
    });

    it('maps inactive user correctly', () => {
      const user = mapper.toDomain({ ...PRISMA_USER, is_active: false });
      expect(user.isActive).toBe(false);
    });
  });

  describe('toResponseDto', () => {
    it('maps domain entity to response DTO with ISO timestamps', () => {
      const dto = mapper.toResponseDto(DOMAIN_USER);

      expect(dto.id).toBe(DOMAIN_USER.id);
      expect(dto.email).toBe(DOMAIN_USER.email);
      expect(dto.name).toBe(DOMAIN_USER.name);
      expect(dto.role).toBe(UserRole.STANDARD);
      expect(dto.isActive).toBe(true);
      expect(dto.createdAt).toBe(BASE_DATE.toISOString());
      expect(dto.updatedAt).toBe(BASE_DATE.toISOString());
    });

    it('does not expose passwordHash', () => {
      const dto = mapper.toResponseDto(DOMAIN_USER);
      expect(dto).not.toHaveProperty('passwordHash');
    });
  });

  describe('toProfileDto', () => {
    it('maps domain entity to minimal profile DTO', () => {
      const dto = mapper.toProfileDto(DOMAIN_USER);

      expect(dto.id).toBe(DOMAIN_USER.id);
      expect(dto.email).toBe(DOMAIN_USER.email);
      expect(dto.name).toBe(DOMAIN_USER.name);
      expect(dto.role).toBe(UserRole.STANDARD);
      expect(dto.isActive).toBe(true);
    });

    it('does not expose timestamps or passwordHash', () => {
      const dto = mapper.toProfileDto(DOMAIN_USER);
      expect(dto).not.toHaveProperty('passwordHash');
      expect(dto).not.toHaveProperty('createdAt');
      expect(dto).not.toHaveProperty('updatedAt');
    });
  });
});
