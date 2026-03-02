import { IsString, MinLength } from 'class-validator';

export class CreateObservationDto {
  @IsString()
  @MinLength(1)
  content!: string;
}
