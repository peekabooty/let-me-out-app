/**
 * Domain entity representing a notification.
 *
 * Notifications inform users about events related to absences, such as
 * assignment as validator or status changes on their own absences.
 */
export class Notification {
  private constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly absenceId: string,
    public readonly type: string,
    public readonly message: string,
    public readonly read: boolean,
    public readonly createdAt: Date
  ) {}

  /**
   * Creates a new notification.
   *
   * @param {string} id - Notification ID (UUID v7)
   * @param {string} userId - User ID to notify
   * @param {string} absenceId - Related absence ID
   * @param {string} type - Notification type
   * @param {string} message - Notification message
   * @returns {Notification} New notification instance
   */
  static create(
    id: string,
    userId: string,
    absenceId: string,
    type: string,
    message: string
  ): Notification {
    return new Notification(id, userId, absenceId, type, message, false, new Date());
  }

  /**
   * Marks this notification as read.
   *
   * @returns {Notification} New notification instance with read=true
   */
  markAsRead(): Notification {
    return new Notification(
      this.id,
      this.userId,
      this.absenceId,
      this.type,
      this.message,
      true,
      this.createdAt
    );
  }
}
