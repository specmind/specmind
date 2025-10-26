/**
 * Redis Cache Client
 * Infrastructure Layer - Handles Redis caching operations
 */

import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db?: number;
}

export class RedisCache {
  private client: RedisClientType;
  private connected: boolean = false;
  private defaultTTL: number = 300; // 5 minutes

  constructor(config: RedisConfig) {
    this.client = createClient({
      socket: {
        host: config.host,
        port: config.port
      },
      password: config.password,
      database: config.db || 0
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error', err);
    });

    this.client.on('connect', () => {
      console.log('Redis client connected');
    });
  }

  async connect(): Promise<void> {
    await this.client.connect();
    this.connected = true;
    console.log(`Connected to Redis at ${await this.client.ping()}`);
  }

  async disconnect(): Promise<void> {
    await this.client.quit();
    this.connected = false;
    console.log('Disconnected from Redis');
  }

  async get<T>(key: string): Promise<T | null> {
    const value = await this.client.get(key);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    await this.client.setEx(key, ttlSeconds || this.defaultTTL, serialized);
  }

  async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  async invalidatePattern(pattern: string): Promise<void> {
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  isConnected(): boolean {
    return this.connected;
  }

  // Cache helpers
  async cacheTask(taskId: string, task: any): Promise<void> {
    await this.set(`task:${taskId}`, task, 300);
  }

  async getCachedTask(taskId: string): Promise<any> {
    return this.get(`task:${taskId}`);
  }

  async invalidateTask(taskId: string): Promise<void> {
    await this.del(`task:${taskId}`);
    await this.invalidatePattern('tasks:*');
  }

  async cacheTasks(key: string, tasks: any[]): Promise<void> {
    await this.set(key, tasks, 60); // Shorter TTL for lists
  }

  async getCachedTasks(key: string): Promise<any[] | null> {
    return this.get(key);
  }
}

export const createRedisCache = (config: RedisConfig): RedisCache => {
  return new RedisCache(config);
};
