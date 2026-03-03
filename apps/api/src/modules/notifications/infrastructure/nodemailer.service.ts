import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

import type { EmailServicePort } from '../domain/ports/email-service.port';

/**
 * Nodemailer implementation of the email service.
 *
 * Sends email notifications using SMTP configuration from environment variables.
 */
@Injectable()
export class NodemailerService implements EmailServicePort {
  private readonly logger = new Logger(NodemailerService.name);
  private readonly transporter: Transporter;
  private readonly fromAddress: string;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    this.fromAddress = this.configService.get<string>('SMTP_FROM') || 'noreply@letmeout.app';

    // If SMTP is not configured, use a test account (for development)
    if (!host || !user || !pass) {
      this.logger.warn('SMTP credentials not configured. Emails will be logged but not sent.');
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
      });
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
          user,
          pass,
        },
      });
    }
  }

  /**
   * Sends an email.
   *
   * @param {string} to - Recipient email address
   * @param {string} subject - Email subject
   * @param {string} htmlBody - Email body in HTML format
   * @returns {Promise<void>}
   */
  async sendEmail(to: string, subject: string, htmlBody: string): Promise<void> {
    try {
      const info = await this.transporter.sendMail({
        from: this.fromAddress,
        to,
        subject,
        html: htmlBody,
      });

      this.logger.log(`Email sent to ${to}: ${info.messageId || 'no ID'}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${to}`,
        error instanceof Error ? error.stack : String(error)
      );
      throw error;
    }
  }
}
