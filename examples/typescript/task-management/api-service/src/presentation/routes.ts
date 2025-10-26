/**
 * API Routes configuration
 * Presentation Layer - Defines REST API routes and middleware
 */

import express, { Router } from 'express';
import { TaskController } from './task-controller.js';
import { authMiddleware } from '../infrastructure/auth.js';
import { AuthService } from '../infrastructure/auth.js';

export function createRoutes(taskController: TaskController, authService: AuthService): Router {
  const router = express.Router();

  // Public health check
  router.get('/health', (req, res) => {
    res.json({ status: 'healthy' });
  });

  // Protected task routes
  router.get('/tasks', authMiddleware(authService), (req, res) =>
    taskController.getAllTasks(req, res)
  );

  router.get('/tasks/:id', authMiddleware(authService), (req, res) =>
    taskController.getTaskById(req, res)
  );

  router.post('/tasks', authMiddleware(authService), (req, res) =>
    taskController.createTask(req, res)
  );

  router.put('/tasks/:id', authMiddleware(authService), (req, res) =>
    taskController.updateTask(req, res)
  );

  router.delete('/tasks/:id', authMiddleware(authService), (req, res) =>
    taskController.deleteTask(req, res)
  );

  router.post('/tasks/:id/assign', authMiddleware(authService), (req, res) =>
    taskController.assignTask(req, res)
  );

  return router;
}
