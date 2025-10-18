/**
 * Sample TypeScript file for testing
 */

import { Database } from './database'
import * as Utils from './utils'

/**
 * User service for managing users
 */
export class UserService {
  constructor(private db: Database) {}

  /**
   * Get user by ID
   */
  async getUser(id: string): Promise<User | null> {
    return await this.db.find(id)
  }

  async createUser(user: User): Promise<void> {
    await this.db.insert(user)
  }

  private validateUser(user: User): boolean {
    return user.email.includes('@')
  }
}

export interface User {
  id: string
  email: string
  name: string
}

export type UserId = string

export enum UserRole {
  Admin = 'admin',
  User = 'user',
}

/**
 * Format user display name
 */
export function formatUserName(user: User): string {
  return `${user.name} (${user.email})`
}

export const DEFAULT_ROLE = UserRole.User

export default UserService
