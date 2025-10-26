/**
 * Email Controller - REST API for email service
 * Presentation Layer - Handles HTTP requests for sending emails
 */

import { Request, Response } from 'express';
import { EmailSender } from '../business/email-sender.js';
import { EmailTemplateService } from '../business/email-template-service.js';

export interface SendEmailRequest {
  to: string;
  subject: string;
  body: string;
}

export interface SendTemplateEmailRequest {
  to: string;
  template: 'task_assigned' | 'task_status_changed' | 'welcome';
  data: any;
}

export class EmailController {
  private emailSender: EmailSender;
  private templateService: EmailTemplateService;

  constructor(emailSender: EmailSender, templateService: EmailTemplateService) {
    this.emailSender = emailSender;
    this.templateService = templateService;
  }

  async sendEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, subject, body } = req.body as SendEmailRequest;

      if (!to || !subject || !body) {
        res.status(400).json({ error: 'Missing required fields: to, subject, body' });
        return;
      }

      const message = await this.emailSender.queueEmail(to, subject, body);

      res.status(202).json({
        messageId: message.id,
        status: 'queued'
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async sendTemplateEmail(req: Request, res: Response): Promise<void> {
    try {
      const { to, template, data } = req.body as SendTemplateEmailRequest;

      if (!to || !template || !data) {
        res.status(400).json({ error: 'Missing required fields: to, template, data' });
        return;
      }

      let emailContent: { subject: string; body: string };

      switch (template) {
        case 'task_assigned':
          emailContent = this.templateService.generateTaskAssignedEmail(data);
          break;
        case 'task_status_changed':
          emailContent = this.templateService.generateTaskStatusChangedEmail(data);
          break;
        case 'welcome':
          emailContent = this.templateService.generateWelcomeEmail(data.userName, data.userEmail);
          break;
        default:
          res.status(400).json({ error: 'Invalid template name' });
          return;
      }

      const message = await this.emailSender.queueEmail(to, emailContent.subject, emailContent.body);

      res.status(202).json({
        messageId: message.id,
        status: 'queued'
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const pendingCount = await this.emailSender.getPendingCount();

      res.json({
        status: 'operational',
        pendingEmails: pendingCount
      });
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
