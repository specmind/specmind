import { describe, it, expect } from 'vitest';
import { loadPatterns, getLayerPackages, matchesPattern } from '../analyzer/pattern-loader.js';

describe('pattern-loader', () => {
  describe('loadPatterns', () => {
    it('should load all pattern configuration files', () => {
      const patterns = loadPatterns();

      expect(patterns).toBeDefined();
      expect(patterns.data).toBeDefined();
      expect(patterns.api).toBeDefined();
      expect(patterns.external).toBeDefined();
      expect(patterns.databases).toBeDefined();
    });

    it('should load data layer patterns with ORMs and drivers', () => {
      const patterns = loadPatterns();

      expect(patterns.data.orms.typescript).toContain('prisma');
      expect(patterns.data.orms.typescript).toContain('typeorm');
      expect(patterns.data.orms.python).toContain('sqlalchemy');
      expect(patterns.data.orms.python).toContain('django.db');

      expect(patterns.data.drivers.postgresql.typescript).toContain('pg');
      expect(patterns.data.drivers.postgresql.python).toContain('psycopg2');
    });

    it('should load API layer patterns with frameworks', () => {
      const patterns = loadPatterns();

      expect(patterns.api.frameworks.typescript).toContain('express');
      expect(patterns.api.frameworks.typescript).toContain('@nestjs/common');
      expect(patterns.api.frameworks.python).toContain('fastapi');
      expect(patterns.api.frameworks.python).toContain('flask');
    });

    it('should load external layer patterns with services', () => {
      const patterns = loadPatterns();

      expect(patterns.external.services.cloud.aws).toContain('@aws-sdk/*');
      expect(patterns.external.services.payment.stripe).toContain('stripe');
      expect(patterns.external.services.ai.openai).toContain('openai');
    });

    it('should load database mappings with colors', () => {
      const patterns = loadPatterns();

      expect(patterns.databases.postgresql).toBeDefined();
      expect(patterns.databases.postgresql.color).toBe('#336791');
      expect(patterns.databases.postgresql.drivers).toContain('pg');
      expect(patterns.databases.postgresql.orms).toContain('typeorm');
    });

    it('should load message queue patterns', () => {
      const patterns = loadPatterns();

      expect(patterns.external.messageQueues.rabbitmq).toBeDefined();
      expect(patterns.external.messageQueues.rabbitmq.typescript).toContain('amqplib');
      expect(patterns.external.messageQueues.rabbitmq.python).toContain('pika');
      expect(patterns.external.messageQueues.rabbitmq.type).toBe('message-queue');

      expect(patterns.external.messageQueues.kafka).toBeDefined();
      expect(patterns.external.messageQueues.kafka.typescript).toContain('kafkajs');
      expect(patterns.external.messageQueues.kafka.python).toContain('kafka-python');
    });
  });

  describe('getLayerPackages', () => {
    it('should return all packages for data layer', () => {
      const patterns = loadPatterns();
      const packages = getLayerPackages(patterns, 'data');

      expect(packages).toContain('prisma');
      expect(packages).toContain('typeorm');
      expect(packages).toContain('sqlalchemy');
      expect(packages).toContain('pg');
      expect(packages).toContain('psycopg2');
      expect(packages.length).toBeGreaterThan(50); // Should have many packages
    });

    it('should return all packages for API layer', () => {
      const patterns = loadPatterns();
      const packages = getLayerPackages(patterns, 'api');

      expect(packages).toContain('express');
      expect(packages).toContain('@nestjs/common');
      expect(packages).toContain('fastapi');
      expect(packages).toContain('flask');
      expect(packages).toContain('graphql');
    });

    it('should return all packages for external layer', () => {
      const patterns = loadPatterns();
      const packages = getLayerPackages(patterns, 'external');

      expect(packages).toContain('axios');
      expect(packages).toContain('stripe');
      expect(packages).toContain('openai');
      expect(packages).toContain('amqplib');
      expect(packages.length).toBeGreaterThan(100); // Should have many packages
    });

    it('should deduplicate packages', () => {
      const patterns = loadPatterns();
      const packages = getLayerPackages(patterns, 'data');

      const uniquePackages = new Set(packages);
      expect(packages.length).toBe(uniquePackages.size);
    });
  });

  describe('matchesPattern', () => {
    it('should match exact patterns', () => {
      expect(matchesPattern('express', 'express')).toBe(true);
      expect(matchesPattern('fastapi', 'fastapi')).toBe(true);
      expect(matchesPattern('prisma', 'typeorm')).toBe(false);
    });

    it('should match wildcard patterns with /*', () => {
      expect(matchesPattern('@aws-sdk/client-s3', '@aws-sdk/*')).toBe(true);
      expect(matchesPattern('@aws-sdk/client-dynamodb', '@aws-sdk/*')).toBe(true);
      expect(matchesPattern('@aws-sdk/client-lambda', '@aws-sdk/*')).toBe(true);
      expect(matchesPattern('@azure/storage', '@aws-sdk/*')).toBe(false);
    });

    it('should match generic glob patterns', () => {
      expect(matchesPattern('@google-cloud/storage', '@google-cloud/*')).toBe(true);
      expect(matchesPattern('@azure/storage-blob', '@azure/*')).toBe(true);
    });

    it('should not match partial strings', () => {
      expect(matchesPattern('my-express-app', 'express')).toBe(false);
      expect(matchesPattern('fastapi-utils', 'fastapi')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(matchesPattern('', 'express')).toBe(false);
      expect(matchesPattern('express', '')).toBe(false);
    });
  });
});
