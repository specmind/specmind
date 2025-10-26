/**
 * Email Service HTTP Client
 * Infrastructure Layer - Handles communication with external Email Service
 */

export interface EmailServiceConfig {
  baseUrl: string;
  timeout: number;
}

export interface SendTemplateEmailRequest {
  to: string;
  template: 'task_assigned' | 'task_status_changed' | 'welcome';
  data: any;
}

export class EmailServiceClient {
  private config: EmailServiceConfig;

  constructor(config: EmailServiceConfig) {
    this.config = config;
  }

  async sendTemplateEmail(request: SendTemplateEmailRequest): Promise<{ messageId: string; status: string }> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/email/send-template`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout)
      });

      if (!response.ok) {
        throw new Error(`Email service returned ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to send email via Email Service:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/email/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}

export const createEmailServiceClient = (config: EmailServiceConfig): EmailServiceClient => {
  return new EmailServiceClient(config);
};
