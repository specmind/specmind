/**
 * Notification Service - Business logic for sending notifications
 * Business Layer - Handles notification triggers and calls external Email Service
 */

import { Task } from '../data/models.js';
import { User } from '../data/models.js';
import { EmailServiceClient } from '../infrastructure/email-service-client.js';
import { UserRepositoryPostgres } from '../data/user-repository-postgres.js';

export class NotificationService {
  private emailClient: EmailServiceClient;
  private userRepo: UserRepositoryPostgres;

  constructor(emailClient: EmailServiceClient, userRepo: UserRepositoryPostgres) {
    this.emailClient = emailClient;
    this.userRepo = userRepo;
  }

  async notifyTaskAssigned(task: Task): Promise<void> {
    if (!task.assigneeId) {
      return;
    }

    try {
      const user = await this.userRepo.findById(task.assigneeId);
      if (!user) {
        console.error(`User ${task.assigneeId} not found for notification`);
        return;
      }

      await this.emailClient.sendTemplateEmail({
        to: user.email,
        template: 'task_assigned',
        data: {
          taskTitle: task.title,
          assigneeName: user.name,
          priority: task.priority
        }
      });

      console.log(`Task assignment notification sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send task assigned notification:', error);
    }
  }

  async notifyTaskStatusChanged(task: Task): Promise<void> {
    if (!task.assigneeId) {
      return;
    }

    try {
      const user = await this.userRepo.findById(task.assigneeId);
      if (!user) {
        return;
      }

      await this.emailClient.sendTemplateEmail({
        to: user.email,
        template: 'task_status_changed',
        data: {
          taskTitle: task.title,
          oldStatus: 'previous',
          newStatus: task.status
        }
      });

      console.log(`Task status change notification sent to ${user.email}`);
    } catch (error) {
      console.error('Failed to send task status changed notification:', error);
    }
  }

  async notifyTaskCreated(task: Task): Promise<void> {
    console.log(`Notification: New task created - "${task.title}"`);
  }

  async notifyTaskDeleted(taskId: string): Promise<void> {
    console.log(`Notification: Task ${taskId} has been deleted`);
  }
}
