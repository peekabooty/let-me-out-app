import { UserRole } from '@repo/types';

export interface UserProps {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly passwordHash: string;
  readonly role: UserRole;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.passwordHash = props.passwordHash;
    this.role = props.role;
    this.isActive = props.isActive;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }

  isValidator(): boolean {
    return this.role === UserRole.VALIDATOR;
  }

  isAuditor(): boolean {
    return this.role === UserRole.AUDITOR;
  }

  /**
   * Admins do not have an employee profile (RF-07).
   * Only STANDARD and VALIDATOR roles represent employees.
   */
  hasEmployeeProfile(): boolean {
    return this.role === UserRole.STANDARD || this.role === UserRole.VALIDATOR;
  }

  canAccessAdminPanel(): boolean {
    return this.role === UserRole.ADMIN;
  }

  rename(newName: string, now: Date): User {
    return new User({ ...this.toProps(), name: newName, updatedAt: now });
  }

  deactivate(now: Date): User {
    return new User({ ...this.toProps(), isActive: false, updatedAt: now });
  }

  activate(now: Date): User {
    return new User({ ...this.toProps(), isActive: true, updatedAt: now });
  }

  changeRole(newRole: UserRole, now: Date): User {
    return new User({ ...this.toProps(), role: newRole, updatedAt: now });
  }

  private toProps(): UserProps {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      passwordHash: this.passwordHash,
      role: this.role,
      isActive: this.isActive,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
