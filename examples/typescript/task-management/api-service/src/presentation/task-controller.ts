/**
 * Task Controller - REST API endpoints for task management
 * Presentation Layer - Handles HTTP requests and responses
 */

import { Request, Response } from 'express';
import { TaskService } from '../business/task-service.js';
import { CreateTaskInput, UpdateTaskInput, TaskStatus } from '../data/models.js';

export class TaskController {
  private taskService: TaskService;

  constructor(taskService: TaskService) {
    this.taskService = taskService;
  }

  async getAllTasks(req: Request, res: Response): Promise<void> {
    try {
      const status = req.query.status as TaskStatus | undefined;

      const tasks = status
        ? await this.taskService.getTasksByStatus(status)
        : await this.taskService.getAllTasks();

      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getTaskById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const task = await this.taskService.getTaskById(id);

      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.json(task);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async createTask(req: Request, res: Response): Promise<void> {
    try {
      const input: CreateTaskInput = req.body;
      const result = await this.taskService.createTask(input);

      if (result.errors) {
        res.status(400).json({ errors: result.errors });
        return;
      }

      res.status(201).json(result.task);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updateTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const input: UpdateTaskInput = req.body;
      const result = await this.taskService.updateTask(id, input);

      if (result.errors) {
        res.status(400).json({ errors: result.errors });
        return;
      }

      res.json(result.task);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deleteTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deleted = await this.taskService.deleteTask(id);

      if (!deleted) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  async assignTask(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const result = await this.taskService.assignTask(id, userId);

      if (result.errors) {
        res.status(400).json({ errors: result.errors });
        return;
      }

      res.json(result.task);
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}
