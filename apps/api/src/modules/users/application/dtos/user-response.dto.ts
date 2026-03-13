import { Theme, UserRole } from '@repo/types';

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  isActive!: boolean;
  themePreference!: Theme | null;
  avatarUrl!: string | null;
  createdAt!: string;
  updatedAt!: string;
}
