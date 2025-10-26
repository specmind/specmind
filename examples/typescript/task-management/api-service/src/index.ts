/**
 * API Service Entry Point
 * Initializes all layers with PostgreSQL, Redis, and Email Service integration
 */

import express from 'express';
import { createPostgresDatabase } from './infrastructure/postgres.js';
import { createRedisCache } from './infrastructure/redis-cache.js';
import { createEmailServiceClient } from './infrastructure/email-service-client.js';
import { createAuthService } from './infrastructure/auth.js';
import { TaskRepositoryPostgres } from './data/task-repository-postgres.js';
import { UserRepositoryPostgres } from './data/user-repository-postgres.js';
import { TaskValidator } from './business/task-validator.js';
import { NotificationService } from './business/notification-service.js';
import { TaskService } from './business/task-service.js';
import { TaskController } from './presentation/task-controller.js';
import { createRoutes } from './presentation/routes.js';

async function startServer() {
  const app = express();
  const port = process.env.PORT || 3000;

  // Middleware
  app.use(express.json());

  // Initialize Infrastructure Layer
  console.log('Initializing infrastructure...');

  // PostgreSQL Database
  const database = createPostgresDatabase({
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    database: process.env.POSTGRES_DB || 'task_management',
    user: process.env.POSTGRES_USER || 'postgres',
    password: process.env.POSTGRES_PASSWORD || 'postgres',
    max: 20
  });

  await database.connect();

  // Redis Cache
  const redisCache = createRedisCache({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: 0
  });

  await redisCache.connect();

  // Email Service Client
  const emailClient = createEmailServiceClient({
    baseUrl: process.env.EMAIL_SERVICE_URL || 'http://localhost:3001',
    timeout: 10000
  });

  // Test email service connection
  const emailServiceHealthy = await emailClient.checkHealth();
  if (emailServiceHealthy) {
    console.log('Email Service is reachable');
  } else {
    console.warn('Email Service is not reachable - notifications may fail');
  }

  // Auth Service
  const authService = createAuthService({
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    tokenExpiry: '24h'
  });

  // Initialize Data Layer
  console.log('Initializing data layer...');
  const taskRepository = new TaskRepositoryPostgres(database, redisCache);
  const userRepository = new UserRepositoryPostgres(database);

  // Initialize Business Layer
  console.log('Initializing business layer...');
  const taskValidator = new TaskValidator();
  const notificationService = new NotificationService(emailClient, userRepository);
  const taskService = new TaskService(
    taskRepository,
    userRepository,
    taskValidator,
    notificationService
  );

  // Initialize Presentation Layer
  console.log('Initializing presentation layer...');
  const taskController = new TaskController(taskService);
  const routes = createRoutes(taskController, authService);

  // Register routes
  app.use('/api', routes);

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await database.disconnect();
    await redisCache.disconnect();
    process.exit(0);
  });

  // Start server
  app.listen(port, () => {
    console.log(`Task Management API running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/api/health`);
    console.log(`PostgreSQL: Connected`);
    console.log(`Redis: Connected`);
    console.log(`Email Service: ${emailServiceHealthy ? 'Connected' : 'Unavailable'}`);
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
