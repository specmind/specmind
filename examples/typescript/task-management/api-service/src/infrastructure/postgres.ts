/**
 * PostgreSQL Database Connection
 * Infrastructure Layer - Handles PostgreSQL connection and query execution
 */

import { Pool, PoolConfig, QueryResult } from 'pg';

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  max?: number; // Maximum number of clients in the pool
}

export class PostgresDatabase {
  private pool: Pool;
  private connected: boolean = false;

  constructor(config: PostgresConfig) {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      max: config.max || 20
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
  }

  async connect(): Promise<void> {
    try {
      // Test the connection
      const client = await this.pool.connect();
      console.log(`Connected to PostgreSQL database`);
      client.release();
      this.connected = true;

      // Initialize schema
      await this.initializeSchema();
    } catch (error) {
      console.error('Failed to connect to PostgreSQL:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    await this.pool.end();
    this.connected = false;
    console.log('Disconnected from PostgreSQL');
  }

  async query<T = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
    return this.pool.query(text, params);
  }

  async getClient() {
    return this.pool.connect();
  }

  isConnected(): boolean {
    return this.connected;
  }

  private async initializeSchema(): Promise<void> {
    // Create tables if they don't exist
    await this.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id VARCHAR(255) PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        description TEXT NOT NULL,
        status VARCHAR(50) NOT NULL,
        priority VARCHAR(50) NOT NULL,
        assignee_id VARCHAR(255) REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)
    `);

    await this.query(`
      CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)
    `);

    console.log('PostgreSQL schema initialized');
  }
}

export const createPostgresDatabase = (config: PostgresConfig): PostgresDatabase => {
  return new PostgresDatabase(config);
};
