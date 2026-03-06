import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '@repo/types';

import { CreateUserDto } from './create-user.dto';

const validPayload = {
  email: 'admin@test.com',
  name: 'Test User',
  role: UserRole.STANDARD,
};

describe('CreateUserDto', () => {
  it('passes with valid data', async () => {
    const dto = plainToInstance(CreateUserDto, validPayload);
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with invalid email', async () => {
    const dto = plainToInstance(CreateUserDto, { ...validPayload, email: 'not-an-email' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'email')).toBe(true);
  });

  it('fails with name shorter than 2 chars', async () => {
    const dto = plainToInstance(CreateUserDto, { ...validPayload, name: 'A' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('fails with invalid role', async () => {
    const dto = plainToInstance(CreateUserDto, { ...validPayload, role: 'superadmin' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });

  it('fails when required fields are missing', async () => {
    const dto = plainToInstance(CreateUserDto, {});
    const errors = await validate(dto);
    const fields = errors.map((e) => e.property);
    expect(fields).toEqual(expect.arrayContaining(['email', 'name', 'role']));
  });
});
