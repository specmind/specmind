/**
 * API Client - Handles communication with the backend API
 * Data Layer - Provides methods to interact with API endpoints
 */

import { HttpClient } from '../infrastructure/http-client.js';
import { Task, CreateTaskDTO, UpdateTaskDTO, TaskStatus } from './types.js';

export class ApiClient {
  private http: HttpClient;

  constructor(http: HttpClient) {
    this.http = http;
  }

  // Task operations
  async getTasks(status?: TaskStatus): Promise<Task[]> {
    const query = status ? `?status=${status}` : '';
    return this.http.get<Task[]>(`/api/tasks${query}`);
  }

  async getTaskById(id: string): Promise<Task> {
    return this.http.get<Task>(`/api/tasks/${id}`);
  }

  async createTask(data: CreateTaskDTO): Promise<Task> {
    return this.http.post<Task>('/api/tasks', data);
  }

  async updateTask(id: string, data: UpdateTaskDTO): Promise<Task> {
    return this.http.put<Task>(`/api/tasks/${id}`, data);
  }

  async deleteTask(id: string): Promise<void> {
    return this.http.delete(`/api/tasks/${id}`);
  }

  async assignTask(id: string, userId: string): Promise<Task> {
    return this.http.post<Task>(`/api/tasks/${id}/assign`, { userId });
  }
}
