/**
 * User Repository - Data access layer for users
 * Data Layer - Handles user data persistence and retrieval
 */

import { Database } from '../infrastructure/database.js';
import { User } from './models.js';

export class UserRepository {
  private db: Database;
  private users: Map<string, User> = new Map();

  constructor(db: Database) {
    this.db = db;
    this.seedUsers();
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return Array.from(this.users.values()).find(
      user => user.email === email
    ) || null;
  }

  private seedUsers(): void {
    // Pre-populate with some example users
    const users: User[] = [
      {
        id: 'user_1',
        name: 'Alice Johnson',
        email: 'alice@example.com',
        createdAt: new Date()
      },
      {
        id: 'user_2',
        name: 'Bob Smith',
        email: 'bob@example.com',
        createdAt: new Date()
      },
      {
        id: 'user_3',
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        createdAt: new Date()
      }
    ];

    users.forEach(user => this.users.set(user.id, user));
  }
}
