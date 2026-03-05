/**
 * Query to list all notifications for a user.
 */
export class ListNotificationsQuery {
  constructor(public readonly userId: string) {}
}
