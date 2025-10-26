/**
 * SMTP Client - Email delivery infrastructure
 * Infrastructure Layer - Handles SMTP connection and email sending
 */

export interface SMTPConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export class SMTPClient {
  private config: SMTPConfig;
  private connected: boolean = false;

  constructor(config: SMTPConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    console.log(`Connecting to SMTP server at ${this.config.host}:${this.config.port}`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from SMTP server');
    this.connected = false;
  }

  async sendMail(to: string, subject: string, body: string): Promise<boolean> {
    if (!this.connected) {
      throw new Error('SMTP client not connected');
    }

    // Simulate sending email
    console.log(`Sending email to ${to}: ${subject}`);
    return true;
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const createSMTPClient = (config: SMTPConfig): SMTPClient => {
  return new SMTPClient(config);
};
