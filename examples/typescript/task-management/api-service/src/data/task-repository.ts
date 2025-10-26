/**
 * Task Repository - Data access layer for tasks
 * Data Layer - Handles task data persistence and retrieval
 */

import { Database } from '../infrastructure/database.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from './models.js';

export class TaskRepository {
  private db: Database;
  private tasks: Map<string, Task> = new Map();

  constructor(db: Database) {
    this.db = db;
  }

  async findAll(): Promise<Task[]> {
    return Array.from(this.tasks.values());
  }

  async findById(id: string): Promise<Task | null> {
    return this.tasks.get(id) || null;
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.assigneeId === assigneeId
    );
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    return Array.from(this.tasks.values()).filter(
      task => task.status === status
    );
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const task: Task = {
      id: this.generateId(),
      title: input.title,
      description: input.description,
      status: TaskStatus.TODO,
      priority: input.priority,
      assigneeId: input.assigneeId || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.tasks.set(task.id, task);
    return task;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const task = this.tasks.get(id);
    if (!task) {
      return null;
    }

    const updated: Task = {
      ...task,
      ...input,
      updatedAt: new Date()
    };

    this.tasks.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.tasks.delete(id);
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
