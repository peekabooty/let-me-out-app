import { IsString, Matches, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color!: string;
}
