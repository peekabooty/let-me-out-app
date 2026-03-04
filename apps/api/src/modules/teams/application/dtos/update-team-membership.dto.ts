import { IsUUID } from 'class-validator';

export class UpdateTeamMembershipDto {
  @IsUUID()
  userId!: string;
}
