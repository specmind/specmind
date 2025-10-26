/**
 * Task Repository - PostgreSQL implementation
 * Data Layer - Handles task data persistence and retrieval using PostgreSQL
 */

import { PostgresDatabase } from '../infrastructure/postgres.js';
import { RedisCache } from '../infrastructure/redis-cache.js';
import { Task, CreateTaskInput, UpdateTaskInput, TaskStatus } from './models.js';

export class TaskRepositoryPostgres {
  private db: PostgresDatabase;
  private cache: RedisCache;

  constructor(db: PostgresDatabase, cache: RedisCache) {
    this.db = db;
    this.cache = cache;
  }

  async findAll(): Promise<Task[]> {
    // Check cache first
    const cached = await this.cache.getCachedTasks('tasks:all');
    if (cached) {
      return cached;
    }

    const result = await this.db.query<Task>(`
      SELECT id, title, description, status, priority, assignee_id as "assigneeId",
             created_at as "createdAt", updated_at as "updatedAt"
      FROM tasks
      ORDER BY created_at DESC
    `);

    const tasks = result.rows;

    // Cache the result
    await this.cache.cacheTasks('tasks:all', tasks);

    return tasks;
  }

  async findById(id: string): Promise<Task | null> {
    // Check cache first
    const cached = await this.cache.getCachedTask(id);
    if (cached) {
      return cached;
    }

    const result = await this.db.query<Task>(
      `SELECT id, title, description, status, priority, assignee_id as "assigneeId",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM tasks
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const task = result.rows[0];

    // Cache the task
    await this.cache.cacheTask(id, task);

    return task;
  }

  async findByAssignee(assigneeId: string): Promise<Task[]> {
    const result = await this.db.query<Task>(
      `SELECT id, title, description, status, priority, assignee_id as "assigneeId",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM tasks
       WHERE assignee_id = $1
       ORDER BY created_at DESC`,
      [assigneeId]
    );

    return result.rows;
  }

  async findByStatus(status: TaskStatus): Promise<Task[]> {
    const cacheKey = `tasks:status:${status}`;
    const cached = await this.cache.getCachedTasks(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await this.db.query<Task>(
      `SELECT id, title, description, status, priority, assignee_id as "assigneeId",
              created_at as "createdAt", updated_at as "updatedAt"
       FROM tasks
       WHERE status = $1
       ORDER BY created_at DESC`,
      [status]
    );

    const tasks = result.rows;
    await this.cache.cacheTasks(cacheKey, tasks);

    return tasks;
  }

  async create(input: CreateTaskInput): Promise<Task> {
    const id = this.generateId();
    const now = new Date();

    const result = await this.db.query<Task>(
      `INSERT INTO tasks (id, title, description, status, priority, assignee_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, description, status, priority, assignee_id as "assigneeId",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      [
        id,
        input.title,
        input.description,
        TaskStatus.TODO,
        input.priority,
        input.assigneeId || null,
        now,
        now
      ]
    );

    const task = result.rows[0];

    // Invalidate cache
    await this.cache.invalidatePattern('tasks:*');

    return task;
  }

  async update(id: string, input: UpdateTaskInput): Promise<Task | null> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (input.title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(input.title);
    }
    if (input.description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(input.description);
    }
    if (input.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(input.status);
    }
    if (input.priority !== undefined) {
      updates.push(`priority = $${paramIndex++}`);
      values.push(input.priority);
    }
    if (input.assigneeId !== undefined) {
      updates.push(`assignee_id = $${paramIndex++}`);
      values.push(input.assigneeId);
    }

    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date());

    values.push(id);

    const result = await this.db.query<Task>(
      `UPDATE tasks
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING id, title, description, status, priority, assignee_id as "assigneeId",
                 created_at as "createdAt", updated_at as "updatedAt"`,
      values
    );

    if (result.rows.length === 0) {
      return null;
    }

    const task = result.rows[0];

    // Invalidate cache
    await this.cache.invalidateTask(id);

    return task;
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.db.query(
      'DELETE FROM tasks WHERE id = $1',
      [id]
    );

    // Invalidate cache
    await this.cache.invalidateTask(id);

    return (result.rowCount ?? 0) > 0;
  }

  private generateId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
