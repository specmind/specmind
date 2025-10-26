import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Pattern configuration types
export interface DataLayerPatterns {
  orms: {
    typescript: string[];
    python: string[];
  };
  drivers: Record<string, {
    typescript: string[];
    python: string[];
  }>;
  queryBuilders: string[];
  filePatterns: string[];
  codePatterns: string[];
}

export interface APILayerPatterns {
  frameworks: {
    typescript: string[];
    python: string[];
  };
  graphql: string[];
  httpDecorators: string[];
  graphqlPatterns: string[];
  filePatterns: string[];
  rpcPatterns: string[];
}

export interface ExternalLayerPatterns {
  httpClients: {
    typescript: string[];
    python: string[];
  };
  services: Record<string, Record<string, string[]>>;
  messageQueues: Record<string, {
    typescript?: string[];
    python?: string[];
    type: string;
  }>;
  codePatterns: string[];
  filePatterns: string[];
}

export interface DatabaseMapping {
  drivers: string[];
  orms: string[];
}

export interface ServiceDetectionPatterns {
  monorepoPatterns: string[];
  metaFrameworks: string[];
  entryPoints: string[];
  commonSourceDirectories: string[];
  frontend: {
    frameworks: {
      typescript: string[];
      python: string[];
    };
    buildTools: string[];
    fileIndicators: string[];
  };
  apiServer: {
    frameworks: {
      typescript: string[];
      python: string[];
    };
    fileIndicators: string[];
  };
  worker: {
    frameworks: {
      typescript: string[];
      python: string[];
    };
    fileIndicators: string[];
  };
  library: {
    packageJsonIndicators: string[];
  };
}

export interface PatternConfig {
  data: DataLayerPatterns;
  api: APILayerPatterns;
  external: ExternalLayerPatterns;
  databases: Record<string, DatabaseMapping>;
  serviceDetection: ServiceDetectionPatterns;
}

/**
 * Load all pattern configuration files
 */
export function loadPatterns(): PatternConfig {
  const patternsDir = join(__dirname, 'patterns');

  const dataLayer = JSON.parse(
    readFileSync(join(patternsDir, 'data-layer.json'), 'utf-8')
  ) as DataLayerPatterns;

  const apiLayer = JSON.parse(
    readFileSync(join(patternsDir, 'api-layer.json'), 'utf-8')
  ) as APILayerPatterns;

  const externalLayer = JSON.parse(
    readFileSync(join(patternsDir, 'external-layer.json'), 'utf-8')
  ) as ExternalLayerPatterns;

  const databases = JSON.parse(
    readFileSync(join(patternsDir, 'databases.json'), 'utf-8')
  ) as Record<string, DatabaseMapping>;

  const serviceDetection = JSON.parse(
    readFileSync(join(patternsDir, 'service-detection.json'), 'utf-8')
  ) as ServiceDetectionPatterns;

  return {
    data: dataLayer,
    api: apiLayer,
    external: externalLayer,
    databases,
    serviceDetection
  };
}

/**
 * Load patterns with optional custom overrides
 * Future feature: allow users to extend patterns via .specmind/patterns.json
 */
export function loadPatternsWithOverrides(customPath?: string): PatternConfig {
  const defaults = loadPatterns();

  if (customPath && existsSync(customPath)) {
    try {
      const custom = JSON.parse(readFileSync(customPath, 'utf-8'));
      return deepMerge(defaults, custom);
    } catch (error) {
      console.warn(`Failed to load custom patterns from ${customPath}:`, error);
      return defaults;
    }
  }

  return defaults;
}

/**
 * Deep merge two objects (for pattern overrides)
 */
function deepMerge<T>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (Array.isArray(sourceValue) && Array.isArray(targetValue)) {
      // Merge arrays (concatenate and deduplicate)
      result[key] = [...new Set([...targetValue, ...sourceValue])] as any;
    } else if (
      typeof sourceValue === 'object' &&
      sourceValue !== null &&
      typeof targetValue === 'object' &&
      targetValue !== null &&
      !Array.isArray(sourceValue)
    ) {
      // Recursively merge objects
      result[key] = deepMerge(targetValue, sourceValue) as any;
    } else if (sourceValue !== undefined) {
      // Override primitive values
      result[key] = sourceValue as any;
    }
  }

  return result;
}

/**
 * Get all packages/libraries for a specific layer (flattened list)
 */
export function getLayerPackages(config: PatternConfig, layer: 'data' | 'api' | 'external'): string[] {
  const packages: string[] = [];

  if (layer === 'data') {
    packages.push(...config.data.orms.typescript);
    packages.push(...config.data.orms.python);
    packages.push(...config.data.queryBuilders);

    for (const db of Object.values(config.data.drivers)) {
      packages.push(...db.typescript);
      packages.push(...db.python);
    }
  } else if (layer === 'api') {
    packages.push(...config.api.frameworks.typescript);
    packages.push(...config.api.frameworks.python);
    packages.push(...config.api.graphql);
  } else if (layer === 'external') {
    packages.push(...config.external.httpClients.typescript);
    packages.push(...config.external.httpClients.python);

    for (const category of Object.values(config.external.services)) {
      for (const servicePackages of Object.values(category)) {
        packages.push(...servicePackages);
      }
    }

    for (const queue of Object.values(config.external.messageQueues)) {
      if (queue.typescript) packages.push(...queue.typescript);
      if (queue.python) packages.push(...queue.python);
    }
  }

  return [...new Set(packages)]; // Deduplicate
}

/**
 * Check if an import matches any pattern (supports wildcards like @aws-sdk/*)
 */
export function matchesPattern(importPath: string, pattern: string): boolean {
  if (pattern.endsWith('/*')) {
    // Wildcard pattern like @aws-sdk/*
    const prefix = pattern.slice(0, -2);
    return importPath.startsWith(prefix);
  } else if (pattern.includes('*')) {
    // Generic glob pattern (convert to regex)
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    return regex.test(importPath);
  } else {
    // Exact match
    return importPath === pattern;
  }
}
