import { UserRole } from '@repo/types';

export class UserResponseDto {
  id!: string;
  email!: string;
  name!: string;
  role!: UserRole;
  isActive!: boolean;
  createdAt!: string;
  updatedAt!: string;
}
