export class RemoveTeamMemberCommand {
  constructor(
    public readonly teamId: string,
    public readonly userId: string
  ) {}
}
