import { Theme, UserRole } from '@repo/types';

/**
 * Minimal profile returned by GET /me.
 * Does not expose passwordHash or internal timestamps.
 */
export class UserProfileDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  isActive!: boolean;
  themePreference!: Theme | null;
}
