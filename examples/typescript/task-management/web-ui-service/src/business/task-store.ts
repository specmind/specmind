/**
 * Task Store - State management for tasks
 * Business Layer - Manages task state and business logic
 */

import { ApiClient } from '../data/api-client.js';
import { CacheManager } from '../data/cache-manager.js';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from '../data/types.js';

export type TaskStoreListener = (tasks: Task[]) => void;

export class TaskStore {
  private apiClient: ApiClient;
  private cacheManager: CacheManager;
  private tasks: Task[] = [];
  private listeners: TaskStoreListener[] = [];
  private loading: boolean = false;
  private error: string | null = null;

  constructor(apiClient: ApiClient, cacheManager: CacheManager) {
    this.apiClient = apiClient;
    this.cacheManager = cacheManager;
  }

  subscribe(listener: TaskStoreListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach(listener => listener(this.tasks));
  }

  getTasks(): Task[] {
    return this.tasks;
  }

  isLoading(): boolean {
    return this.loading;
  }

  getError(): string | null {
    return this.error;
  }

  async loadTasks(status?: TaskStatus): Promise<void> {
    // Try to get from cache first
    const cached = this.cacheManager.getCachedTasks();
    if (cached && !status) {
      this.tasks = cached;
      this.notify();
      return;
    }

    this.loading = true;
    this.error = null;

    try {
      this.tasks = await this.apiClient.getTasks(status);
      this.cacheManager.cacheTasks(this.tasks);
      this.notify();
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to load tasks';
    } finally {
      this.loading = false;
    }
  }

  async createTask(data: CreateTaskDTO): Promise<Task | null> {
    this.loading = true;
    this.error = null;

    try {
      const task = await this.apiClient.createTask(data);
      this.tasks.push(task);
      this.cacheManager.invalidateCache();
      this.notify();
      return task;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to create task';
      return null;
    } finally {
      this.loading = false;
    }
  }

  async updateTask(id: string, data: UpdateTaskDTO): Promise<Task | null> {
    this.loading = true;
    this.error = null;

    try {
      const task = await this.apiClient.updateTask(id, data);
      const index = this.tasks.findIndex(t => t.id === id);
      if (index !== -1) {
        this.tasks[index] = task;
      }
      this.cacheManager.invalidateTask(id);
      this.notify();
      return task;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to update task';
      return null;
    } finally {
      this.loading = false;
    }
  }

  async deleteTask(id: string): Promise<boolean> {
    this.loading = true;
    this.error = null;

    try {
      await this.apiClient.deleteTask(id);
      this.tasks = this.tasks.filter(t => t.id !== id);
      this.cacheManager.invalidateTask(id);
      this.notify();
      return true;
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Failed to delete task';
      return false;
    } finally {
      this.loading = false;
    }
  }
}
