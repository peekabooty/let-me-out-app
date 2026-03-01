import { UserRole } from '@repo/types';

export class UpdateUserCommand {
  constructor(
    public readonly id: string,
    public readonly name?: string,
    public readonly role?: UserRole
  ) {}
}
