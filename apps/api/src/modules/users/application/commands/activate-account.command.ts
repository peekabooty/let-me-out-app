export class ActivateAccountCommand {
  constructor(
    public readonly token: string,
    public readonly password: string
  ) {}
}
