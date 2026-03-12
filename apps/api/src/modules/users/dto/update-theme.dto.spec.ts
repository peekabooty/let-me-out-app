import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Theme } from '@repo/types';

import { UpdateThemeDto } from './update-theme.dto';

describe('UpdateThemeDto', () => {
  it('passes with valid theme', async () => {
    const dto = plainToInstance(UpdateThemeDto, { theme: Theme.CARAMEL });
    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it('fails with invalid theme', async () => {
    const dto = plainToInstance(UpdateThemeDto, { theme: 'neon' });
    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'theme')).toBe(true);
  });
});
