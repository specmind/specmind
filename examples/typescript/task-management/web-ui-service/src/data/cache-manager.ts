/**
 * Cache Manager - Manages local caching of API data
 * Data Layer - Reduces API calls by caching frequently accessed data
 */

import { LocalStorageManager } from '../infrastructure/local-storage.js';
import { Task } from './types.js';

export class CacheManager {
  private storage: LocalStorageManager;
  private cacheDuration: number; // in milliseconds

  constructor(storage: LocalStorageManager, cacheDuration: number = 5 * 60 * 1000) {
    this.storage = storage;
    this.cacheDuration = cacheDuration;
  }

  cacheTasks(tasks: Task[]): void {
    this.storage.set('tasks', {
      data: tasks,
      timestamp: Date.now()
    });
  }

  getCachedTasks(): Task[] | null {
    const cached = this.storage.get<{ data: Task[]; timestamp: number }>('tasks');

    if (!cached) {
      return null;
    }

    // Check if cache is still valid
    if (Date.now() - cached.timestamp > this.cacheDuration) {
      this.storage.remove('tasks');
      return null;
    }

    return cached.data;
  }

  cacheTask(task: Task): void {
    this.storage.set(`task:${task.id}`, {
      data: task,
      timestamp: Date.now()
    });
  }

  getCachedTask(id: string): Task | null {
    const cached = this.storage.get<{ data: Task; timestamp: number }>(`task:${id}`);

    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > this.cacheDuration) {
      this.storage.remove(`task:${id}`);
      return null;
    }

    return cached.data;
  }

  invalidateCache(): void {
    this.storage.clear();
  }

  invalidateTask(id: string): void {
    this.storage.remove(`task:${id}`);
    this.storage.remove('tasks');
  }
}
