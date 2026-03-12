import { Theme, UserRole } from '@repo/types';

import { User } from './user.entity';

const BASE_DATE = new Date('2026-01-01T10:00:00.000Z');
const LATER_DATE = new Date('2026-06-01T10:00:00.000Z');

function makeUser(overrides: Partial<ConstructorParameters<typeof User>[0]> = {}): User {
  return new User({
    id: '01950000-0000-7000-0000-000000000001',
    email: 'ana@example.com',
    name: 'Ana García',
    passwordHash: '$2b$12$hashedpassword',
    role: UserRole.STANDARD,
    isActive: true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  });
}

describe('User entity', () => {
  describe('role helpers', () => {
    it('isAdmin returns true only for ADMIN role', () => {
      expect(makeUser({ role: UserRole.ADMIN }).isAdmin()).toBe(true);
      expect(makeUser({ role: UserRole.STANDARD }).isAdmin()).toBe(false);
      expect(makeUser({ role: UserRole.VALIDATOR }).isAdmin()).toBe(false);
      expect(makeUser({ role: UserRole.AUDITOR }).isAdmin()).toBe(false);
    });

    it('isValidator returns true only for VALIDATOR role', () => {
      expect(makeUser({ role: UserRole.VALIDATOR }).isValidator()).toBe(true);
      expect(makeUser({ role: UserRole.STANDARD }).isValidator()).toBe(false);
    });

    it('isAuditor returns true only for AUDITOR role', () => {
      expect(makeUser({ role: UserRole.AUDITOR }).isAuditor()).toBe(true);
      expect(makeUser({ role: UserRole.STANDARD }).isAuditor()).toBe(false);
    });
  });

  describe('hasEmployeeProfile (RF-07)', () => {
    it('returns true for STANDARD and VALIDATOR', () => {
      expect(makeUser({ role: UserRole.STANDARD }).hasEmployeeProfile()).toBe(true);
      expect(makeUser({ role: UserRole.VALIDATOR }).hasEmployeeProfile()).toBe(true);
    });

    it('returns false for ADMIN and AUDITOR', () => {
      expect(makeUser({ role: UserRole.ADMIN }).hasEmployeeProfile()).toBe(false);
      expect(makeUser({ role: UserRole.AUDITOR }).hasEmployeeProfile()).toBe(false);
    });
  });

  describe('canAccessAdminPanel (RF-03, RF-42)', () => {
    it('returns true only for ADMIN', () => {
      expect(makeUser({ role: UserRole.ADMIN }).canAccessAdminPanel()).toBe(true);
      expect(makeUser({ role: UserRole.STANDARD }).canAccessAdminPanel()).toBe(false);
      expect(makeUser({ role: UserRole.VALIDATOR }).canAccessAdminPanel()).toBe(false);
      expect(makeUser({ role: UserRole.AUDITOR }).canAccessAdminPanel()).toBe(false);
    });
  });

  describe('deactivate', () => {
    it('returns a new User with isActive false and updated updatedAt', () => {
      const user = makeUser();
      const deactivated = user.deactivate(LATER_DATE);

      expect(deactivated.isActive).toBe(false);
      expect(deactivated.updatedAt).toBe(LATER_DATE);
      expect(deactivated.id).toBe(user.id);
      // original is immutable
      expect(user.isActive).toBe(true);
    });
  });

  describe('activate', () => {
    it('returns a new User with isActive true and updated updatedAt', () => {
      const user = makeUser({ isActive: false });
      const activated = user.activate(LATER_DATE);

      expect(activated.isActive).toBe(true);
      expect(activated.updatedAt).toBe(LATER_DATE);
      expect(user.isActive).toBe(false);
    });
  });

  describe('changeRole', () => {
    it('returns a new User with the new role and updated updatedAt', () => {
      const user = makeUser({ role: UserRole.STANDARD });
      const promoted = user.changeRole(UserRole.VALIDATOR, LATER_DATE);

      expect(promoted.role).toBe(UserRole.VALIDATOR);
      expect(promoted.updatedAt).toBe(LATER_DATE);
      expect(user.role).toBe(UserRole.STANDARD);
    });
  });

  describe('changeThemePreference', () => {
    it('returns a new User with updated theme preference and updatedAt', () => {
      const user = makeUser({ themePreference: Theme.LIGHT });
      const themed = user.changeThemePreference(Theme.CHOCOLATE, LATER_DATE);

      expect(themed.themePreference).toBe(Theme.CHOCOLATE);
      expect(themed.updatedAt).toBe(LATER_DATE);
      expect(user.themePreference).toBe(Theme.LIGHT);
    });
  });
});
