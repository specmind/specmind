/**
 * Email Sender - Core email sending logic
 * Business Layer - Orchestrates email sending with retry logic
 */

import { SMTPClient } from '../infrastructure/smtp-client.js';
import { EmailQueue, EmailMessage } from '../data/email-queue.js';

export class EmailSender {
  private smtpClient: SMTPClient;
  private emailQueue: EmailQueue;
  private processing: boolean = false;

  constructor(smtpClient: SMTPClient, emailQueue: EmailQueue) {
    this.smtpClient = smtpClient;
    this.emailQueue = emailQueue;
  }

  async queueEmail(to: string, subject: string, body: string): Promise<EmailMessage> {
    const message = await this.emailQueue.enqueue(to, subject, body);

    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }

    return message;
  }

  private async processQueue(): Promise<void> {
    if (this.processing) {
      return;
    }

    this.processing = true;

    while (true) {
      const message = await this.emailQueue.dequeue();

      if (!message) {
        break;
      }

      try {
        await this.sendEmail(message);
        await this.emailQueue.markAsSent(message.id);
        console.log(`Email ${message.id} sent successfully`);
      } catch (error) {
        console.error(`Failed to send email ${message.id}:`, error);
        await this.emailQueue.markAsFailed(message.id);
      }

      // Small delay between emails
      await this.sleep(100);
    }

    this.processing = false;
  }

  private async sendEmail(message: EmailMessage): Promise<void> {
    if (!this.smtpClient.isConnected()) {
      await this.smtpClient.connect();
    }

    const success = await this.smtpClient.sendMail(
      message.to,
      message.subject,
      message.body
    );

    if (!success) {
      throw new Error('SMTP send failed');
    }
  }

  async getPendingCount(): Promise<number> {
    const pending = await this.emailQueue.getPending();
    return pending.length;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
