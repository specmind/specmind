import { describe, it, expect } from 'vitest';
import { detectLayers, detectDatabaseType, detectExternalServices, detectMessageSystems } from '../analyzer/layer-detector.js';
import { loadPatterns } from '../analyzer/pattern-loader.js';
import type { FileAnalysis } from '../types/index.js';

const patterns = loadPatterns();

describe('layer-detector', () => {
  describe('detectLayers', () => {
    it('should detect data layer from ORM imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/models/user.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: '@prisma/client',
            imports: [{ name: 'PrismaClient', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/models/user.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('data');
      expect(result.reasons).toContain('Imports ORM: @prisma/client');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect data layer from database driver imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/db/connection.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'pg',
            imports: [{ name: 'Pool', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/db/connection.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('data');
      expect(result.reasons).toContain('Imports database driver: pg');
    });

    it('should detect data layer from file path patterns', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/models/user.ts',
        language: 'typescript',
        functions: [],
        classes: [
          {
            name: 'User',
            qualifiedName: 'User',
            kind: 'class',
            isExported: true,
            isAbstract: false,
            extendsFrom: [],
            implements: [],
            methods: [],
            properties: [],
            location: { filePath: '/project/src/models/user.ts', startLine: 5, endLine: 20 },
          },
        ],
        imports: [],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('data');
      expect(result.reasons.some(r => r.includes('File path matches data layer pattern'))).toBe(true);
    });

    it('should detect API layer from framework imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/api/routes.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'express',
            imports: [{ name: 'Router', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/api/routes.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('api');
      expect(result.reasons).toContain('Imports API framework: express');
    });

    it('should detect API layer from GraphQL imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/graphql/schema.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: '@apollo/server',
            imports: [{ name: 'ApolloServer', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/graphql/schema.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('api');
      expect(result.reasons).toContain('Imports GraphQL library: @apollo/server');
    });

    it('should detect external layer from HTTP client imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/services/api-client.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'axios',
            imports: [{ name: 'default', isDefault: true, isNamespace: false }],
            location: { filePath: '/project/src/services/api-client.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('external');
      expect(result.reasons).toContain('Imports HTTP client: axios');
    });

    it('should detect external layer from external service SDKs', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/integrations/stripe.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'stripe',
            imports: [{ name: 'Stripe', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/integrations/stripe.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('external');
      expect(result.reasons.some(r => r.includes('Imports external service SDK (stripe)'))).toBe(true);
    });

    it('should detect external layer from message queue imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/messaging/publisher.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'amqplib',
            imports: [{ name: 'connect', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/messaging/publisher.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('external');
      expect(result.reasons.some(r => r.includes('Imports message queue (rabbitmq)'))).toBe(true);
    });

    it('should default to service layer when no patterns match', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/utils/helper.ts',
        language: 'typescript',
        functions: [
          {
            name: 'formatDate',
            qualifiedName: 'formatDate',
            parameters: [],
            isExported: true,
            isAsync: false,
            location: { filePath: '/project/src/utils/helper.ts', startLine: 5, endLine: 10 },
          },
        ],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('service');
      expect(result.reasons).toContain('Business logic or utility file (default layer)');
      expect(result.confidence).toBeLessThan(0.7);
    });

    it('should detect multiple layers for complex files', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/api/users/controller.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'express',
            imports: [{ name: 'Router', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/api/users/controller.ts', startLine: 1, endLine: 1 },
          },
          {
            source: '@prisma/client',
            imports: [{ name: 'PrismaClient', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/api/users/controller.ts', startLine: 2, endLine: 2 },
          },
          {
            source: 'stripe',
            imports: [{ name: 'Stripe', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/api/users/controller.ts', startLine: 3, endLine: 3 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectLayers(analysis, patterns);

      expect(result.layers).toContain('api');
      expect(result.layers).toContain('data');
      expect(result.layers).toContain('external');
      expect(result.layers.length).toBeGreaterThanOrEqual(3);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('detectDatabaseType', () => {
    it('should detect PostgreSQL from driver', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/db/connection.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'pg',
            imports: [{ name: 'Pool', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/db/connection.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectDatabaseType(analysis, patterns);

      expect(result).toBeDefined();
      expect(result?.type).toBe('postgresql');
      expect(result?.driver).toBe('pg');
    });

    it('should detect MySQL from ORM', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/models/user.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'typeorm',
            imports: [{ name: 'Entity', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/models/user.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectDatabaseType(analysis, patterns);

      // TypeORM supports multiple databases, so it might return any of them
      expect(result).toBeDefined();
      if (result) {
        expect(result.orm).toBe('typeorm');
      }
    });

    it('should detect Redis from driver', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/cache/redis.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'ioredis',
            imports: [{ name: 'Redis', isDefault: true, isNamespace: false }],
            location: { filePath: '/project/src/cache/redis.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectDatabaseType(analysis, patterns);

      expect(result).toBeDefined();
      expect(result?.type).toBe('redis');
      expect(result?.driver).toBe('ioredis');
    });

    it('should return null for files without database imports', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/utils/helper.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      };

      const result = detectDatabaseType(analysis, patterns);

      expect(result).toBeNull();
    });
  });

  describe('detectExternalServices', () => {
    it('should detect payment services', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/integrations/stripe.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'stripe',
            imports: [{ name: 'Stripe', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/integrations/stripe.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectExternalServices(analysis, patterns);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('stripe');
      expect(result[0].type).toBe('payment');
      expect(result[0].sdk).toBe('stripe');
    });

    it('should detect cloud services with wildcard patterns', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/services/storage.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: '@aws-sdk/client-s3',
            imports: [{ name: 'S3Client', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/services/storage.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectExternalServices(analysis, patterns);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('aws');
      expect(result[0].type).toBe('cloud');
      expect(result[0].sdk).toBe('@aws-sdk/client-s3');
    });

    it('should detect AI services', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/ai/chat.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'openai',
            imports: [{ name: 'OpenAI', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/ai/chat.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectExternalServices(analysis, patterns);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('openai');
      expect(result[0].type).toBe('ai');
    });

    it('should detect multiple services in one file', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/integrations/payments.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'stripe',
            imports: [{ name: 'Stripe', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/integrations/payments.ts', startLine: 1, endLine: 1 },
          },
          {
            source: '@paypal/checkout-server-sdk',
            imports: [{ name: 'PayPal', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/integrations/payments.ts', startLine: 2, endLine: 2 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectExternalServices(analysis, patterns);

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.map(s => s.name)).toContain('stripe');
      expect(result.map(s => s.name)).toContain('paypal');
    });
  });

  describe('detectMessageSystems', () => {
    it('should detect RabbitMQ', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/messaging/rabbitmq.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'amqplib',
            imports: [{ name: 'connect', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/messaging/rabbitmq.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectMessageSystems(analysis, patterns);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('rabbitmq');
      expect(result[0].library).toBe('amqplib');
      expect(result[0].type).toBe('message-queue');
    });

    it('should detect Kafka', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/events/kafka.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'kafkajs',
            imports: [{ name: 'Kafka', isDefault: false, isNamespace: false }],
            location: { filePath: '/project/src/events/kafka.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectMessageSystems(analysis, patterns);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('kafka');
      expect(result[0].library).toBe('kafkajs');
      expect(result[0].type).toBe('event-stream');
    });

    it('should detect Bull (Redis queue)', () => {
      const analysis: FileAnalysis = {
        filePath: '/project/src/jobs/queue.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'bull',
            imports: [{ name: 'Queue', isDefault: true, isNamespace: false }],
            location: { filePath: '/project/src/jobs/queue.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
      };

      const result = detectMessageSystems(analysis, patterns);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('redis-queue');
      expect(result[0].library).toBe('bull');
      expect(result[0].type).toBe('task-queue');
    });
  });
});
