/**
 * Email Service Entry Point
 * Initializes all layers and starts the Express server
 */

import express from 'express';
import { createSMTPClient } from './infrastructure/smtp-client.js';
import { EmailQueue } from './data/email-queue.js';
import { EmailSender } from './business/email-sender.js';
import { EmailTemplateService } from './business/email-template-service.js';
import { EmailController } from './presentation/email-controller.js';
import { createRoutes } from './presentation/routes.js';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3001;

  // Middleware
  app.use(express.json());

  // Initialize Infrastructure Layer
  const smtpClient = createSMTPClient({
    host: 'smtp.example.com',
    port: 587,
    secure: false,
    auth: {
      user: 'noreply@example.com',
      pass: 'password'
    }
  });

  await smtpClient.connect();

  // Initialize Data Layer
  const emailQueue = new EmailQueue();

  // Initialize Business Layer
  const emailSender = new EmailSender(smtpClient, emailQueue);
  const templateService = new EmailTemplateService();

  // Initialize Presentation Layer
  const emailController = new EmailController(emailSender, templateService);
  const routes = createRoutes(emailController);

  // Register routes
  app.use('/api/email', routes);

  // Start server
  app.listen(port, () => {
    console.log(`Email Service running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/api/email/health`);
  });
}

startServer().catch(error => {
  console.error('Failed to start email service:', error);
  process.exit(1);
});
