/**
 * Email Service Routes
 * Presentation Layer - Defines REST API routes
 */

import express, { Router } from 'express';
import { EmailController } from './email-controller.js';

export function createRoutes(emailController: EmailController): Router {
  const router = express.Router();

  // Health check
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Send plain email
  router.post('/send', (req, res) => emailController.sendEmail(req, res));

  // Send template-based email
  router.post('/send-template', (req, res) => emailController.sendTemplateEmail(req, res));

  // Get service status
  router.get('/status', (req, res) => emailController.getStatus(req, res));

  return router;
}
