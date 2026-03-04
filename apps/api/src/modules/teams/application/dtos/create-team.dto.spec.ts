import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { CreateTeamDto } from './create-team.dto';

describe('CreateTeamDto', () => {
  it('passes with valid data', async () => {
    const dto = plainToInstance(CreateTeamDto, {
      name: 'Engineering',
      color: '#12ABEF',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('fails with invalid color', async () => {
    const dto = plainToInstance(CreateTeamDto, {
      name: 'Engineering',
      color: 'blue',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'color')).toBe(true);
  });

  it('fails with short name', async () => {
    const dto = plainToInstance(CreateTeamDto, {
      name: 'A',
      color: '#123456',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'name')).toBe(true);
  });
});
