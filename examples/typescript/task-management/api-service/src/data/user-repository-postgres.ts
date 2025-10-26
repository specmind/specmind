/**
 * User Repository - PostgreSQL implementation
 * Data Layer - Handles user data persistence and retrieval using PostgreSQL
 */

import { PostgresDatabase } from '../infrastructure/postgres.js';
import { User } from './models.js';

export class UserRepositoryPostgres {
  private db: PostgresDatabase;

  constructor(db: PostgresDatabase) {
    this.db = db;
    this.seedUsers();
  }

  async findAll(): Promise<User[]> {
    const result = await this.db.query<User>(`
      SELECT id, name, email, created_at as "createdAt"
      FROM users
      ORDER BY name
    `);

    return result.rows;
  }

  async findById(id: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT id, name, email, created_at as "createdAt"
       FROM users
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.query<User>(
      `SELECT id, name, email, created_at as "createdAt"
       FROM users
       WHERE email = $1`,
      [email]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  private async seedUsers(): Promise<void> {
    // Check if users already exist
    const countResult = await this.db.query('SELECT COUNT(*) as count FROM users');
    const count = parseInt(countResult.rows[0].count);

    if (count > 0) {
      return; // Already seeded
    }

    // Pre-populate with some example users
    const users = [
      { id: 'user_1', name: 'Alice Johnson', email: 'alice@example.com' },
      { id: 'user_2', name: 'Bob Smith', email: 'bob@example.com' },
      { id: 'user_3', name: 'Charlie Brown', email: 'charlie@example.com' }
    ];

    for (const user of users) {
      await this.db.query(
        `INSERT INTO users (id, name, email, created_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [user.id, user.name, user.email, new Date()]
      );
    }

    console.log('Seeded users into PostgreSQL');
  }
}
