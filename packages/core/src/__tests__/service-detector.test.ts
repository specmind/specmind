import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { detectServices } from '../analyzer/service-detector.js';

const TEST_DIR = join(process.cwd(), 'test-temp-services');

describe('service-detector', () => {
  beforeEach(() => {
    // Clean up test directory before each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory after each test
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('detectServices - monorepo', () => {
    it('should detect services in packages/ directory', () => {
      // Create monorepo structure
      mkdirSync(join(TEST_DIR, 'packages', 'api'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'packages', 'worker'), { recursive: true });

      writeFileSync(join(TEST_DIR, 'packages', 'api', 'package.json'), JSON.stringify({ name: 'api' }));
      writeFileSync(join(TEST_DIR, 'packages', 'worker', 'package.json'), JSON.stringify({ name: 'worker' }));

      const apiFile = join(TEST_DIR, 'packages', 'api', 'index.ts');
      const workerFile = join(TEST_DIR, 'packages', 'worker', 'index.ts');

      writeFileSync(apiFile, 'export const api = true;');
      writeFileSync(workerFile, 'export const worker = true;');

      const allFiles = [apiFile, workerFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services.length).toBeGreaterThanOrEqual(2);
      expect(services.map(s => s.name)).toContain('api');
      expect(services.map(s => s.name)).toContain('worker');
    });

    it('should detect services in services/ directory', () => {
      mkdirSync(join(TEST_DIR, 'services', 'frontend'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'services', 'backend'), { recursive: true });

      writeFileSync(join(TEST_DIR, 'services', 'frontend', 'package.json'), JSON.stringify({ name: 'frontend' }));
      writeFileSync(join(TEST_DIR, 'services', 'backend', 'package.json'), JSON.stringify({ name: 'backend' }));

      const frontendFile = join(TEST_DIR, 'services', 'frontend', 'app.tsx');
      const backendFile = join(TEST_DIR, 'services', 'backend', 'server.ts');

      writeFileSync(frontendFile, 'export const App = () => null;');
      writeFileSync(backendFile, 'export const server = true;');

      const allFiles = [frontendFile, backendFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services.length).toBeGreaterThanOrEqual(2);
      expect(services.map(s => s.name)).toContain('frontend');
      expect(services.map(s => s.name)).toContain('backend');
    });

    it('should detect services in apps/ directory', () => {
      mkdirSync(join(TEST_DIR, 'apps', 'web'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'apps', 'mobile'), { recursive: true });

      writeFileSync(join(TEST_DIR, 'apps', 'web', 'package.json'), JSON.stringify({ name: 'web' }));
      writeFileSync(join(TEST_DIR, 'apps', 'mobile', 'package.json'), JSON.stringify({ name: 'mobile' }));

      const webFile = join(TEST_DIR, 'apps', 'web', 'index.ts');
      const mobileFile = join(TEST_DIR, 'apps', 'mobile', 'index.ts');

      writeFileSync(webFile, 'export const web = true;');
      writeFileSync(mobileFile, 'export const mobile = true;');

      const allFiles = [webFile, mobileFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services.length).toBeGreaterThanOrEqual(2);
    });

    it('should detect services with pnpm-workspace.yaml', () => {
      writeFileSync(join(TEST_DIR, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');

      mkdirSync(join(TEST_DIR, 'packages', 'core'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'packages', 'core', 'package.json'), JSON.stringify({ name: 'core' }));

      const coreFile = join(TEST_DIR, 'packages', 'core', 'index.ts');
      writeFileSync(coreFile, 'export const core = true;');

      const allFiles = [coreFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services.length).toBeGreaterThanOrEqual(1);
      expect(services[0].name).toBe('core');
    });
  });

  describe('detectServices - monolith', () => {
    it('should detect single service for monolith', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({ name: 'my-app' }));

      const file1 = join(TEST_DIR, 'src', 'index.ts');
      const file2 = join(TEST_DIR, 'src', 'utils.ts');

      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(file1, 'export const app = true;');
      writeFileSync(file2, 'export const utils = true;');

      const allFiles = [file1, file2];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].name).toBe('my-app');
      expect(services[0].files).toHaveLength(2);
      expect(services[0].type).toBeDefined();
    });

    it('should use directory name if no package.json', () => {
      const file1 = join(TEST_DIR, 'src', 'index.ts');
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(file1, 'export const app = true;');

      const allFiles = [file1];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      // Should use directory name
      expect(services[0].name).toBeTruthy();
    });
  });

  describe('detectServices - Python projects', () => {
    it('should detect Python monorepo with pyproject.toml', () => {
      mkdirSync(join(TEST_DIR, 'packages', 'api'), { recursive: true });
      mkdirSync(join(TEST_DIR, 'packages', 'worker'), { recursive: true });

      writeFileSync(
        join(TEST_DIR, 'packages', 'api', 'pyproject.toml'),
        '[project]\nname = "api"\n'
      );
      writeFileSync(
        join(TEST_DIR, 'packages', 'worker', 'pyproject.toml'),
        '[project]\nname = "worker"\n'
      );

      const apiFile = join(TEST_DIR, 'packages', 'api', 'main.py');
      const workerFile = join(TEST_DIR, 'packages', 'worker', 'main.py');

      writeFileSync(apiFile, 'def main(): pass');
      writeFileSync(workerFile, 'def main(): pass');

      const allFiles = [apiFile, workerFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('detectServices - service types', () => {
    it('should detect api-server type', () => {
      mkdirSync(join(TEST_DIR, 'src', 'routes'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
        name: 'api-server',
        dependencies: { express: '^4.0.0' }
      }));

      const routeFile = join(TEST_DIR, 'src', 'routes', 'users.ts');
      writeFileSync(routeFile, 'export const router = express.Router();');

      const allFiles = [routeFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].type).toBe('api-server');
    });

    it('should detect worker type', () => {
      mkdirSync(join(TEST_DIR, 'src', 'workers'), { recursive: true });
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({ name: 'worker' }));

      const workerFile = join(TEST_DIR, 'src', 'workers', 'email.ts');
      writeFileSync(workerFile, 'export const emailWorker = true;');

      const allFiles = [workerFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].type).toBe('worker');
    });

    it('should detect frontend type', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
        name: 'frontend',
        dependencies: { react: '^18.0.0', next: '^14.0.0' }
      }));

      const appFile = join(TEST_DIR, 'app', 'page.tsx');
      mkdirSync(join(TEST_DIR, 'app'), { recursive: true });
      writeFileSync(appFile, 'export default function Page() { return null; }');

      const allFiles = [appFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].type).toBe('frontend');
    });

    it('should detect library type', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
        name: '@my-org/utils',
        main: './dist/index.js',
        exports: { '.': './dist/index.js' }
      }));

      const indexFile = join(TEST_DIR, 'src', 'index.ts');
      mkdirSync(join(TEST_DIR, 'src'), { recursive: true });
      writeFileSync(indexFile, 'export const utils = true;');

      const allFiles = [indexFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].type).toBe('library');
    });
  });

  describe('detectServices - framework detection', () => {
    it('should detect Express framework', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
        name: 'api',
        dependencies: { express: '^4.0.0' }
      }));

      const serverFile = join(TEST_DIR, 'server.ts');
      writeFileSync(serverFile, 'import express from "express";');

      const allFiles = [serverFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].framework).toBe('express');
    });

    it('should detect NestJS framework', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
        name: 'api',
        dependencies: { '@nestjs/core': '^10.0.0' }
      }));

      const mainFile = join(TEST_DIR, 'main.ts');
      writeFileSync(mainFile, 'import { NestFactory } from "@nestjs/core";');

      const allFiles = [mainFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].framework).toBe('@nestjs/core');
    });

    it('should detect FastAPI framework', () => {
      writeFileSync(
        join(TEST_DIR, 'requirements.txt'),
        'fastapi==0.100.0\nuvicorn==0.23.0\n'
      );

      const mainFile = join(TEST_DIR, 'main.py');
      writeFileSync(mainFile, 'from fastapi import FastAPI');

      const allFiles = [mainFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].framework).toBe('fastapi');
    });

    it('should detect Next.js framework', () => {
      writeFileSync(join(TEST_DIR, 'package.json'), JSON.stringify({
        name: 'web',
        dependencies: { next: '^14.0.0', react: '^18.0.0' }
      }));

      const pageFile = join(TEST_DIR, 'app', 'page.tsx');
      mkdirSync(join(TEST_DIR, 'app'), { recursive: true });
      writeFileSync(pageFile, 'export default function Page() {}');

      const allFiles = [pageFile];
      const services = detectServices(TEST_DIR, allFiles);

      expect(services).toHaveLength(1);
      expect(services[0].framework).toBe('next');
    });
  });
});
