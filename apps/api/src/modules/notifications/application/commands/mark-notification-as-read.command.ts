/**
 * Command to mark a notification as read.
 */
export class MarkNotificationAsReadCommand {
  constructor(
    public readonly notificationId: string,
    public readonly userId: string
  ) {}
}
