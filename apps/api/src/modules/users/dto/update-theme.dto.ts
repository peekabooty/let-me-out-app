import { IsIn } from 'class-validator';

import { Theme } from '@repo/types';

export class UpdateThemeDto {
  @IsIn(Object.values(Theme))
  theme!: Theme;
}
