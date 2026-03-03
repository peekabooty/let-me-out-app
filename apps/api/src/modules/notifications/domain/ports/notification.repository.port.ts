import type { Notification } from '../notification.entity';

/**
 * Repository port for notification persistence.
 *
 * Defines the contract for storing and retrieving notifications.
 */
export interface NotificationRepositoryPort {
  /**
   * Saves a notification.
   *
   * @param {Notification} notification - Notification to save
   * @returns {Promise<void>}
   */
  save(notification: Notification): Promise<void>;

  /**
   * Finds a notification by ID.
   *
   * @param {string} id - Notification ID
   * @returns {Promise<Notification | null>}
   */
  findById(id: string): Promise<Notification | null>;

  /**
   * Finds all notifications for a user.
   *
   * @param {string} userId - User ID
   * @returns {Promise<Notification[]>}
   */
  findByUserId(userId: string): Promise<Notification[]>;
}
