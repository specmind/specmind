import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, basename, dirname } from 'path';

/**
 * Service detection result
 */
export interface Service {
  name: string;
  rootPath: string;
  entryPoint?: string | undefined;
  type: 'api-server' | 'worker' | 'frontend' | 'library' | 'unknown';
  framework?: string | undefined;
  port?: number | undefined;
  files: string[]; // Absolute paths of files in this service
}

/**
 * Detect all services in a codebase (monorepo or monolith)
 */
export function detectServices(rootPath: string, allFiles: string[]): Service[] {
  // 1. Check for monorepo structure
  const monorepoServices = detectMonorepoServices(rootPath, allFiles);
  if (monorepoServices.length > 0) {
    console.log(`Detected ${monorepoServices.length} services in monorepo`);
    return monorepoServices;
  }

  // 2. Check for multiple entry points (multi-service monolith)
  const entryPointServices = detectByEntryPoints(rootPath, allFiles);
  if (entryPointServices.length > 1) {
    console.log(`Detected ${entryPointServices.length} services by entry points`);
    return entryPointServices;
  }

  // 3. Check Docker compose
  const dockerServices = detectDockerComposeServices(rootPath, allFiles);
  if (dockerServices.length > 0) {
    console.log(`Detected ${dockerServices.length} services from Docker Compose`);
    return dockerServices;
  }

  // 4. Default: Single service (monolith)
  console.log('Detected single service (monolith)');
  return [{
    name: getServiceName(rootPath),
    rootPath,
    type: detectServiceType(rootPath, allFiles),
    files: allFiles,
  }];
}

/**
 * Detect monorepo structure (packages/, services/, apps/)
 */
function detectMonorepoServices(rootPath: string, allFiles: string[]): Service[] {
  const services: Service[] = [];
  const monorepoPatterns = ['packages', 'services', 'apps', 'microservices'];

  // Check for monorepo config files
  const hasMonorepoConfig =
    existsSync(join(rootPath, 'pnpm-workspace.yaml')) ||
    existsSync(join(rootPath, 'lerna.json')) ||
    existsSync(join(rootPath, 'nx.json')) ||
    existsSync(join(rootPath, 'turbo.json'));

  if (!hasMonorepoConfig) {
    // Check for package directories
    let hasPackageDirs = false;
    for (const pattern of monorepoPatterns) {
      const dirPath = join(rootPath, pattern);
      if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
        hasPackageDirs = true;
        break;
      }
    }

    if (!hasPackageDirs) {
      return [];
    }
  }

  // Scan for service directories
  for (const pattern of monorepoPatterns) {
    const dirPath = join(rootPath, pattern);
    if (!existsSync(dirPath)) continue;

    try {
      const entries = readdirSync(dirPath);
      for (const entry of entries) {
        const servicePath = join(dirPath, entry);
        const stats = statSync(servicePath);

        if (!stats.isDirectory()) continue;

        // Check if this directory has a package.json or pyproject.toml
        const hasPackageFile =
          existsSync(join(servicePath, 'package.json')) ||
          existsSync(join(servicePath, 'pyproject.toml')) ||
          existsSync(join(servicePath, 'Cargo.toml')) ||
          existsSync(join(servicePath, 'go.mod'));

        if (hasPackageFile) {
          const serviceFiles = allFiles.filter(f => f.startsWith(servicePath));
          if (serviceFiles.length > 0) {
            services.push({
              name: entry,
              rootPath: servicePath,
              type: detectServiceType(servicePath, serviceFiles),
              framework: detectFramework(servicePath, serviceFiles),
              files: serviceFiles,
            });
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }
  }

  return services;
}

/**
 * Detect services by multiple entry points
 */
function detectByEntryPoints(_rootPath: string, allFiles: string[]): Service[] {
  const entryPointPatterns = [
    'main.py',
    'index.ts',
    'index.js',
    'app.py',
    'server.ts',
    'server.js',
    '__main__.py',
  ];

  const entryPoints = allFiles.filter(file => {
    const baseName = basename(file);
    return entryPointPatterns.includes(baseName);
  });

  if (entryPoints.length <= 1) {
    return [];
  }

  // Group files by entry point directory
  const serviceMap = new Map<string, string[]>();

  for (const entry of entryPoints) {
    const dir = dirname(entry);
    serviceMap.set(dir, allFiles.filter(f => f.startsWith(dir)));
  }

  const services: Service[] = [];
  for (const [dir, files] of serviceMap.entries()) {
    const name = basename(dir);
    services.push({
      name,
      rootPath: dir,
      entryPoint: entryPoints.find(e => dirname(e) === dir),
      type: detectServiceType(dir, files),
      files,
    });
  }

  return services;
}

/**
 * Detect services from Docker Compose file
 */
function detectDockerComposeServices(rootPath: string, allFiles: string[]): Service[] {
  const composeFiles = [
    'docker-compose.yml',
    'docker-compose.yaml',
    'compose.yml',
    'compose.yaml',
  ];

  let composePath: string | null = null;
  for (const file of composeFiles) {
    const path = join(rootPath, file);
    if (existsSync(path)) {
      composePath = path;
      break;
    }
  }

  if (!composePath) {
    return [];
  }

  try {
    const content = readFileSync(composePath, 'utf-8');
    const services: Service[] = [];

    // Simple YAML parsing for service names (not a full YAML parser)
    // Look for lines like "  service-name:" under "services:"
    const lines = content.split('\n');
    let inServices = false;

    for (const line of lines) {
      if (line.trim() === 'services:') {
        inServices = true;
        continue;
      }

      if (inServices && line.match(/^  \w+:/)) {
        const serviceName = line.trim().replace(':', '');
        const servicePath = join(rootPath, serviceName);

        // Check if directory exists
        if (existsSync(servicePath) && statSync(servicePath).isDirectory()) {
          const serviceFiles = allFiles.filter(f => f.startsWith(servicePath));
          if (serviceFiles.length > 0) {
            services.push({
              name: serviceName,
              rootPath: servicePath,
              type: detectServiceType(servicePath, serviceFiles),
              files: serviceFiles,
            });
          }
        }
      }

      // Exit services section when we hit a non-indented line
      if (inServices && line.length > 0 && !line.startsWith(' ')) {
        inServices = false;
      }
    }

    return services;
  } catch (error) {
    console.warn(`Failed to parse Docker Compose file ${composePath}:`, error);
    return [];
  }
}

/**
 * Detect service type based on files and structure
 */
function detectServiceType(
  servicePath: string,
  files: string[]
): 'api-server' | 'worker' | 'frontend' | 'library' | 'unknown' {
  const hasPackageJson = existsSync(join(servicePath, 'package.json'));

  // Check for API frameworks
  const apiIndicators = [
    'routes', 'routers', 'controllers', 'api', 'endpoints',
    'server.ts', 'server.js', 'app.py', 'main.py'
  ];

  const hasApiIndicators = files.some(f =>
    apiIndicators.some(indicator => f.includes(indicator))
  );

  if (hasApiIndicators) {
    return 'api-server';
  }

  // Check for worker/background job patterns
  const workerIndicators = ['worker', 'jobs', 'tasks', 'queue', 'celery'];
  const hasWorkerIndicators = files.some(f =>
    workerIndicators.some(indicator => f.includes(indicator))
  );

  if (hasWorkerIndicators) {
    return 'worker';
  }

  // Check for frontend
  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(readFileSync(join(servicePath, 'package.json'), 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      const frontendFrameworks = ['react', 'vue', 'next', 'nuxt', 'angular', 'svelte'];
      const isFrontend = frontendFrameworks.some(fw => deps[fw]);

      if (isFrontend) {
        return 'frontend';
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Check if it's a library (has package.json with "main" or "exports")
  if (hasPackageJson) {
    try {
      const pkg = JSON.parse(readFileSync(join(servicePath, 'package.json'), 'utf-8'));
      if (pkg.main || pkg.exports) {
        return 'library';
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  return 'unknown';
}

/**
 * Detect framework used by service
 */
function detectFramework(servicePath: string, _files: string[]): string | undefined {
  const packageJsonPath = join(servicePath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Check for common frameworks
      const frameworks = [
        'express',
        '@nestjs/core',
        'fastify',
        'koa',
        'next',
        'nuxt',
        'react',
        'vue',
        'angular',
        'svelte',
      ];

      for (const fw of frameworks) {
        if (deps[fw]) {
          return fw;
        }
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Check Python frameworks
  const requirementsPath = join(servicePath, 'requirements.txt');
  if (existsSync(requirementsPath)) {
    try {
      const content = readFileSync(requirementsPath, 'utf-8');
      const pythonFrameworks = ['fastapi', 'flask', 'django', 'starlette', 'tornado'];

      for (const fw of pythonFrameworks) {
        if (content.includes(fw)) {
          return fw;
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  // Check pyproject.toml
  const pyprojectPath = join(servicePath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      const pythonFrameworks = ['fastapi', 'flask', 'django', 'starlette', 'tornado'];

      for (const fw of pythonFrameworks) {
        if (content.includes(fw)) {
          return fw;
        }
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  return undefined;
}

/**
 * Get service name from directory or package.json
 */
function getServiceName(servicePath: string): string {
  // Try package.json "name" field
  const packageJsonPath = join(servicePath, 'package.json');
  if (existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      if (pkg.name) {
        return pkg.name;
      }
    } catch (error) {
      // Ignore parse errors
    }
  }

  // Try pyproject.toml "name" field
  const pyprojectPath = join(servicePath, 'pyproject.toml');
  if (existsSync(pyprojectPath)) {
    try {
      const content = readFileSync(pyprojectPath, 'utf-8');
      const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
      if (nameMatch && nameMatch[1]) {
        return nameMatch[1];
      }
    } catch (error) {
      // Ignore read errors
    }
  }

  // Fallback to directory name
  return basename(servicePath);
}
