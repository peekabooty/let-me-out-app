export class AddTeamMemberCommand {
  constructor(
    public readonly teamId: string,
    public readonly userId: string
  ) {}
}
