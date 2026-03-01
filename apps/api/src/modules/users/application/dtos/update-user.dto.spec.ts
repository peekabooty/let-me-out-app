import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { UserRole } from '@repo/types';

import { UpdateUserDto } from './update-user.dto';

describe('UpdateUserDto', () => {
  it('passes with valid name and role', async () => {
    const dto = plainToInstance(UpdateUserDto, { name: 'New Name', role: UserRole.VALIDATOR });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes with only name', async () => {
    const dto = plainToInstance(UpdateUserDto, { name: 'New Name' });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes with only role', async () => {
    const dto = plainToInstance(UpdateUserDto, { role: UserRole.AUDITOR });
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('passes with empty body (all fields optional)', async () => {
    const dto = plainToInstance(UpdateUserDto, {});
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with name shorter than 2 chars', async () => {
    const dto = plainToInstance(UpdateUserDto, { name: 'X' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'name')).toBe(true);
  });

  it('fails with invalid role', async () => {
    const dto = plainToInstance(UpdateUserDto, { role: 'god' });
    const errors = await validate(dto);
    expect(errors.some((e) => e.property === 'role')).toBe(true);
  });
});
