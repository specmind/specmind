/**
 * User service for managing user operations
 */

import { Database } from './database'
import { EmailService } from './email-service'

export enum UserRole {
  Admin = 'admin',
  User = 'user',
  Guest = 'guest',
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: Date
}

export type UserId = string

export abstract class BaseService {
  protected abstract getName(): string

  public log(message: string): void {
    console.log(`[${this.getName()}] ${message}`)
  }
}

export class UserService extends BaseService {
  private db: Database
  private emailService: EmailService

  constructor(db: Database, emailService: EmailService) {
    super()
    this.db = db
    this.emailService = emailService
  }

  protected getName(): string {
    return 'UserService'
  }

  public async getUser(id: UserId): Promise<User> {
    this.log(`Fetching user ${id}`)
    return await this.db.findUser(id)
  }

  public async createUser(data: Partial<User>): Promise<User> {
    this.log('Creating new user')
    const user = await this.db.createUser(data)
    await this.emailService.sendWelcomeEmail(user.email)
    return user
  }

  public async deleteUser(id: UserId): Promise<void> {
    this.log(`Deleting user ${id}`)
    await this.db.deleteUser(id)
  }

  public static async findByEmail(email: string): Promise<User | null> {
    // Static method example
    return null
  }
}

export async function validateUserEmail(email: string): Promise<boolean> {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}
