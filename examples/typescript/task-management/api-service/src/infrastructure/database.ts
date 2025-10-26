/**
 * Database connection and configuration
 * Infrastructure Layer - Handles database setup and connection management
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
}

export class Database {
  private config: DatabaseConfig;
  private connected: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    // Simulate database connection
    console.log(`Connecting to database at ${this.config.host}:${this.config.port}`);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    console.log('Disconnecting from database');
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  getConfig(): DatabaseConfig {
    return this.config;
  }
}

export const createDatabase = (config: DatabaseConfig): Database => {
  return new Database(config);
};
