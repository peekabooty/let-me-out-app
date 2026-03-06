import { UserRole } from '@repo/types';

export class CreateUserCommand {
  constructor(
    public readonly email: string,
    public readonly name: string,
    public readonly role: UserRole
  ) {}
}
