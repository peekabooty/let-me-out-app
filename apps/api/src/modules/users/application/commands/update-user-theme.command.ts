import { Theme } from '@repo/types';

export class UpdateUserThemeCommand {
  constructor(
    public readonly userId: string,
    public readonly theme: Theme
  ) {}
}
