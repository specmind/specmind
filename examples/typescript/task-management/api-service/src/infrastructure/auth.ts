/**
 * Authentication middleware and utilities
 * Infrastructure Layer - Handles authentication and authorization
 */

import { Request, Response, NextFunction } from 'express';

export interface AuthConfig {
  jwtSecret: string;
  tokenExpiry: string;
}

export class AuthService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  verifyToken(token: string): boolean {
    // Simulate token verification
    return token.startsWith('Bearer ');
  }

  generateToken(userId: string): string {
    // Simulate token generation
    return `Bearer token_for_${userId}`;
  }
}

export const authMiddleware = (authService: AuthService) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authService.verifyToken(authHeader)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  };
};

export const createAuthService = (config: AuthConfig): AuthService => {
  return new AuthService(config);
};
