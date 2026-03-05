/**
 * Query to get all members of a team.
 */
export class GetTeamMembersQuery {
  constructor(
    public readonly teamId: string,
    public readonly requesterId: string
  ) {}
}
