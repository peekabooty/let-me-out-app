import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@repo/types';

import type { ClockService } from '../../../../common';
import { User } from '../../../users/domain/user.entity';
import type { UserRepositoryPort } from '../../../users/domain/ports/user.repository.port';
import { Team } from '../../domain/team.entity';
import type { TeamRepositoryPort } from '../../domain/ports/team.repository.port';
import { AddTeamMemberCommand } from './add-team-member.command';
import { AddTeamMemberHandler } from './add-team-member.handler';

const NOW = new Date('2025-01-01T00:00:00.000Z');

const mockClock: ClockService = {
  now: () => NOW,
} as ClockService;

const makeTeam = (): Team =>
  new Team({
    id: '01900000-0000-7000-8000-000000000001',
    name: 'Engineering',
    color: '#123456',
    createdAt: NOW,
    updatedAt: NOW,
  });

const makeUser = (role: UserRole, isActive = true): User =>
  new User({
    id: '01900000-0000-7000-8000-000000000010',
    email: 'user@test.com',
    name: 'User',
    passwordHash: 'hash',
    role,
    isActive,
    createdAt: NOW,
    updatedAt: NOW,
  });

const makeTeamRepo = (overrides: Partial<TeamRepositoryPort> = {}): TeamRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(makeTeam()),
  findAll: jest.fn(),
  save: jest.fn(),
  delete: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  isMember: jest.fn().mockResolvedValue(false),
  findMembers: jest.fn().mockResolvedValue([]),
  ...overrides,
});

const makeUserRepo = (overrides: Partial<UserRepositoryPort> = {}): UserRepositoryPort => ({
  findById: jest.fn().mockResolvedValue(makeUser(UserRole.STANDARD)),
  findByEmail: jest.fn(),
  findByActivationTokenHash: jest.fn(),
  findAll: jest.fn(),
  hasActiveAbsences: jest.fn().mockResolvedValue(false),
  save: jest.fn(),
  update: jest.fn(),
  delete: jest.fn().mockResolvedValue(undefined),
  ...overrides,
});

describe('AddTeamMemberHandler', () => {
  it('adds member when team and user are valid', async () => {
    const teamRepository = makeTeamRepo();
    const userRepository = makeUserRepo();
    const handler = new AddTeamMemberHandler(teamRepository, userRepository, mockClock);

    await handler.execute(
      new AddTeamMemberCommand(
        '01900000-0000-7000-8000-000000000001',
        '01900000-0000-7000-8000-000000000010'
      )
    );

    expect(teamRepository.addMember).toHaveBeenCalledWith(
      '01900000-0000-7000-8000-000000000001',
      '01900000-0000-7000-8000-000000000010',
      NOW
    );
  });

  it('throws NotFoundException when team does not exist', async () => {
    const teamRepository = makeTeamRepo({ findById: jest.fn().mockResolvedValue(null) });
    const userRepository = makeUserRepo();
    const handler = new AddTeamMemberHandler(teamRepository, userRepository, mockClock);

    await expect(
      handler.execute(
        new AddTeamMemberCommand('missing-team', '01900000-0000-7000-8000-000000000010')
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws NotFoundException when user does not exist', async () => {
    const teamRepository = makeTeamRepo();
    const userRepository = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });
    const handler = new AddTeamMemberHandler(teamRepository, userRepository, mockClock);

    await expect(
      handler.execute(
        new AddTeamMemberCommand('01900000-0000-7000-8000-000000000001', 'missing-user')
      )
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws BadRequestException when user is auditor', async () => {
    const teamRepository = makeTeamRepo();
    const userRepository = makeUserRepo({
      findById: jest.fn().mockResolvedValue(makeUser(UserRole.AUDITOR)),
    });
    const handler = new AddTeamMemberHandler(teamRepository, userRepository, mockClock);

    await expect(
      handler.execute(
        new AddTeamMemberCommand(
          '01900000-0000-7000-8000-000000000001',
          '01900000-0000-7000-8000-000000000010'
        )
      )
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ConflictException when user is already a member', async () => {
    const teamRepository = makeTeamRepo({ isMember: jest.fn().mockResolvedValue(true) });
    const userRepository = makeUserRepo();
    const handler = new AddTeamMemberHandler(teamRepository, userRepository, mockClock);

    await expect(
      handler.execute(
        new AddTeamMemberCommand(
          '01900000-0000-7000-8000-000000000001',
          '01900000-0000-7000-8000-000000000010'
        )
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
