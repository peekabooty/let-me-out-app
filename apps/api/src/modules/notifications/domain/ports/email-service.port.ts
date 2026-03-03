/**
 * Port for sending email notifications.
 *
 * Abstracts email sending infrastructure from domain logic.
 */
export interface EmailServicePort {
  /**
   * Sends an email notification.
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlBody - Email body in HTML format
   * @returns {Promise<void>}
   */
  sendEmail(to: string, subject: string, htmlBody: string): Promise<void>;
}
