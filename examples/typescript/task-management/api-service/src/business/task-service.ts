/**
 * Task Service - Core business logic for task management
 * Business Layer - Orchestrates task operations and enforces business rules
 */

import { TaskRepository } from '../data/task-repository.js';
import { UserRepository } from '../data/user-repository.js';
import { TaskValidator } from './task-validator.js';
import { NotificationService } from './notification-service.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from '../data/models.js';

export class TaskService {
  private taskRepo: TaskRepository;
  private userRepo: UserRepository;
  private validator: TaskValidator;
  private notificationService: NotificationService;

  constructor(
    taskRepo: TaskRepository,
    userRepo: UserRepository,
    validator: TaskValidator,
    notificationService: NotificationService
  ) {
    this.taskRepo = taskRepo;
    this.userRepo = userRepo;
    this.validator = validator;
    this.notificationService = notificationService;
  }

  async getAllTasks(): Promise<Task[]> {
    return this.taskRepo.findAll();
  }

  async getTaskById(id: string): Promise<Task | null> {
    return this.taskRepo.findById(id);
  }

  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    return this.taskRepo.findByStatus(status);
  }

  async createTask(input: CreateTaskInput): Promise<{ task?: Task; errors?: string[] }> {
    // Validate input
    const validation = this.validator.validateCreateTask(input);
    if (!validation.valid) {
      return { errors: validation.errors };
    }

    // Validate assignee exists if provided
    if (input.assigneeId) {
      const user = await this.userRepo.findById(input.assigneeId);
      if (!user) {
        return { errors: ['Assignee not found'] };
      }
    }

    // Create task
    const task = await this.taskRepo.create(input);

    // Send notification if task is assigned
    if (task.assigneeId) {
      await this.notificationService.notifyTaskAssigned(task);
    }

    return { task };
  }

  async updateTask(id: string, input: UpdateTaskInput): Promise<{ task?: Task; errors?: string[] }> {
    // Check if task exists
    const existingTask = await this.taskRepo.findById(id);
    if (!existingTask) {
      return { errors: ['Task not found'] };
    }

    // Validate input
    const validation = this.validator.validateUpdateTask(input);
    if (!validation.valid) {
      return { errors: validation.errors };
    }

    // Validate assignee exists if being updated
    if (input.assigneeId) {
      const user = await this.userRepo.findById(input.assigneeId);
      if (!user) {
        return { errors: ['Assignee not found'] };
      }
    }

    // Update task
    const task = await this.taskRepo.update(id, input);

    // Send notifications for status changes
    if (input.status && input.status !== existingTask.status) {
      await this.notificationService.notifyTaskStatusChanged(task!);
    }

    // Send notification for new assignment
    if (input.assigneeId && input.assigneeId !== existingTask.assigneeId) {
      await this.notificationService.notifyTaskAssigned(task!);
    }

    return { task: task! };
  }

  async deleteTask(id: string): Promise<boolean> {
    return this.taskRepo.delete(id);
  }

  async assignTask(taskId: string, userId: string): Promise<{ task?: Task; errors?: string[] }> {
    const task = await this.taskRepo.findById(taskId);
    if (!task) {
      return { errors: ['Task not found'] };
    }

    const user = await this.userRepo.findById(userId);
    if (!user) {
      return { errors: ['User not found'] };
    }

    const updated = await this.taskRepo.update(taskId, { assigneeId: userId });
    if (updated) {
      await this.notificationService.notifyTaskAssigned(updated);
    }

    return { task: updated! };
  }
}
