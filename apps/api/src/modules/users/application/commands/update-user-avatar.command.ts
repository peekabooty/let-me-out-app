export class UpdateUserAvatarCommand {
  constructor(
    public readonly userId: string,
    public readonly originalFilename: string,
    public readonly buffer: Buffer
  ) {}
}
