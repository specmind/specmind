/**
 * Email Queue - Stores emails to be sent
 * Data Layer - Manages email queue persistence
 */

export interface EmailMessage {
  id: string;
  to: string;
  subject: string;
  body: string;
  status: 'pending' | 'sent' | 'failed';
  retries: number;
  createdAt: Date;
  sentAt?: Date;
}

export class EmailQueue {
  private queue: Map<string, EmailMessage> = new Map();

  async enqueue(to: string, subject: string, body: string): Promise<EmailMessage> {
    const message: EmailMessage = {
      id: this.generateId(),
      to,
      subject,
      body,
      status: 'pending',
      retries: 0,
      createdAt: new Date()
    };

    this.queue.set(message.id, message);
    return message;
  }

  async dequeue(): Promise<EmailMessage | null> {
    for (const [id, message] of this.queue.entries()) {
      if (message.status === 'pending') {
        return message;
      }
    }
    return null;
  }

  async markAsSent(id: string): Promise<void> {
    const message = this.queue.get(id);
    if (message) {
      message.status = 'sent';
      message.sentAt = new Date();
    }
  }

  async markAsFailed(id: string): Promise<void> {
    const message = this.queue.get(id);
    if (message) {
      message.retries++;
      if (message.retries >= 3) {
        message.status = 'failed';
      }
    }
  }

  async getPending(): Promise<EmailMessage[]> {
    return Array.from(this.queue.values()).filter(m => m.status === 'pending');
  }

  async getById(id: string): Promise<EmailMessage | null> {
    return this.queue.get(id) || null;
  }

  private generateId(): string {
    return `email_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
