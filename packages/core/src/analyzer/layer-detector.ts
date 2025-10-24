import { FileAnalysis, Layer, LayerDetectionResult } from '../types/index.js';
import { loadPatterns, matchesPattern, PatternConfig } from './pattern-loader.js';
import { minimatch } from 'minimatch';

/**
 * Detect which architectural layers a file belongs to
 * A file can belong to multiple layers (e.g., API controller that also makes external calls)
 */
export function detectLayers(analysis: FileAnalysis, patterns?: PatternConfig): LayerDetectionResult {
  const config = patterns || loadPatterns();
  const layers: Layer[] = [];
  const reasons: string[] = [];

  // Check data layer
  const dataResult = hasDataLayerPatterns(analysis, config);
  if (dataResult.match) {
    layers.push('data');
    reasons.push(...dataResult.reasons);
  }

  // Check API layer
  const apiResult = hasAPILayerPatterns(analysis, config);
  if (apiResult.match) {
    layers.push('api');
    reasons.push(...apiResult.reasons);
  }

  // Check external layer
  const externalResult = hasExternalLayerPatterns(analysis, config);
  if (externalResult.match) {
    layers.push('external');
    reasons.push(...externalResult.reasons);
  }

  // Default to service layer if no other layers detected
  if (layers.length === 0) {
    layers.push('service');
    reasons.push('Business logic or utility file (default layer)');
  }

  const confidence = calculateConfidence(layers, reasons);

  return {
    layers,
    confidence,
    reasons,
  };
}

/**
 * Check if file matches data layer patterns
 */
function hasDataLayerPatterns(
  analysis: FileAnalysis,
  config: PatternConfig
): { match: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check ORM imports
  const allOrms = [
    ...config.data.orms.typescript,
    ...config.data.orms.python,
  ];

  for (const imp of analysis.imports) {
    if (allOrms.some(orm => matchesPattern(imp.source, orm))) {
      reasons.push(`Imports ORM: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check database driver imports
  const allDrivers: string[] = [];
  for (const db of Object.values(config.data.drivers)) {
    allDrivers.push(...db.typescript, ...db.python);
  }

  for (const imp of analysis.imports) {
    if (allDrivers.some(driver => matchesPattern(imp.source, driver))) {
      reasons.push(`Imports database driver: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check query builders
  for (const imp of analysis.imports) {
    if (config.data.queryBuilders.some(qb => matchesPattern(imp.source, qb))) {
      reasons.push(`Imports query builder: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check file patterns
  for (const pattern of config.data.filePatterns) {
    if (minimatch(analysis.filePath, pattern)) {
      reasons.push(`File path matches data layer pattern: ${pattern}`);
      return { match: true, reasons };
    }
  }

  return { match: false, reasons };
}

/**
 * Check if file matches API layer patterns
 */
function hasAPILayerPatterns(
  analysis: FileAnalysis,
  config: PatternConfig
): { match: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check framework imports
  const allFrameworks = [
    ...config.api.frameworks.typescript,
    ...config.api.frameworks.python,
  ];

  for (const imp of analysis.imports) {
    if (allFrameworks.some(fw => matchesPattern(imp.source, fw))) {
      reasons.push(`Imports API framework: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check GraphQL imports
  for (const imp of analysis.imports) {
    if (config.api.graphql.some(gql => matchesPattern(imp.source, gql))) {
      reasons.push(`Imports GraphQL library: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check RPC patterns
  for (const imp of analysis.imports) {
    if (config.api.rpcPatterns.some(rpc => matchesPattern(imp.source, rpc))) {
      reasons.push(`Imports RPC library: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check file patterns
  for (const pattern of config.api.filePatterns) {
    if (minimatch(analysis.filePath, pattern)) {
      reasons.push(`File path matches API layer pattern: ${pattern}`);
      return { match: true, reasons };
    }
  }

  // TODO: Check for HTTP decorators in code (requires AST inspection)
  // For now, we rely on imports and file patterns

  return { match: false, reasons };
}

/**
 * Check if file matches external layer patterns
 */
function hasExternalLayerPatterns(
  analysis: FileAnalysis,
  config: PatternConfig
): { match: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Check HTTP client imports
  const allHttpClients = [
    ...config.external.httpClients.typescript,
    ...config.external.httpClients.python,
  ];

  for (const imp of analysis.imports) {
    if (allHttpClients.some(client => matchesPattern(imp.source, client))) {
      reasons.push(`Imports HTTP client: ${imp.source}`);
      return { match: true, reasons };
    }
  }

  // Check external service SDKs
  for (const category of Object.values(config.external.services)) {
    for (const [serviceName, servicePackages] of Object.entries(category)) {
      for (const imp of analysis.imports) {
        if (servicePackages.some(pkg => matchesPattern(imp.source, pkg))) {
          reasons.push(`Imports external service SDK (${serviceName}): ${imp.source}`);
          return { match: true, reasons };
        }
      }
    }
  }

  // Check message queue imports
  for (const [queueName, queueConfig] of Object.entries(config.external.messageQueues)) {
    const allQueuePackages = [
      ...(queueConfig.typescript || []),
      ...(queueConfig.python || []),
    ];

    for (const imp of analysis.imports) {
      if (allQueuePackages.some(pkg => matchesPattern(imp.source, pkg))) {
        reasons.push(`Imports message queue (${queueName}): ${imp.source}`);
        return { match: true, reasons };
      }
    }
  }

  // Check file patterns
  for (const pattern of config.external.filePatterns) {
    if (minimatch(analysis.filePath, pattern)) {
      reasons.push(`File path matches external layer pattern: ${pattern}`);
      return { match: true, reasons };
    }
  }

  return { match: false, reasons };
}

/**
 * Calculate confidence score based on detection results
 */
function calculateConfidence(layers: Layer[], reasons: string[]): number {
  // High confidence if we detected specific patterns
  if (reasons.length > 0 && layers.length > 0 && !layers.includes('service')) {
    return 0.9;
  }

  // Medium confidence for service layer (default)
  if (layers.includes('service') && layers.length === 1) {
    return 0.5;
  }

  // Very high confidence for multiple layer detections
  if (layers.length > 1) {
    return 0.95;
  }

  return 0.7;
}

/**
 * Detect database type from imports
 */
export function detectDatabaseType(
  analysis: FileAnalysis,
  config: PatternConfig
): { type: string; driver?: string; orm?: string } | null {
  for (const [dbType, dbConfig] of Object.entries(config.databases)) {
    // Check drivers
    for (const driver of dbConfig.drivers) {
      for (const imp of analysis.imports) {
        if (matchesPattern(imp.source, driver)) {
          return { type: dbType, driver };
        }
      }
    }

    // Check ORMs
    for (const orm of dbConfig.orms) {
      for (const imp of analysis.imports) {
        if (matchesPattern(imp.source, orm)) {
          return { type: dbType, orm };
        }
      }
    }
  }

  return null;
}

/**
 * Detect external services from imports
 */
export function detectExternalServices(
  analysis: FileAnalysis,
  config: PatternConfig
): Array<{ name: string; type: string; sdk: string }> {
  const services: Array<{ name: string; type: string; sdk: string }> = [];

  for (const [categoryType, category] of Object.entries(config.external.services)) {
    for (const [serviceName, servicePackages] of Object.entries(category)) {
      for (const imp of analysis.imports) {
        if (servicePackages.some(pkg => matchesPattern(imp.source, pkg))) {
          services.push({
            name: serviceName,
            type: categoryType,
            sdk: imp.source,
          });
        }
      }
    }
  }

  return services;
}

/**
 * Detect message queue systems from imports
 */
export function detectMessageSystems(
  analysis: FileAnalysis,
  config: PatternConfig
): Array<{ name: string; library: string; type: string }> {
  const systems: Array<{ name: string; library: string; type: string }> = [];

  for (const [queueName, queueConfig] of Object.entries(config.external.messageQueues)) {
    const allQueuePackages = [
      ...(queueConfig.typescript || []),
      ...(queueConfig.python || []),
    ];

    for (const imp of analysis.imports) {
      if (allQueuePackages.some(pkg => matchesPattern(imp.source, pkg))) {
        systems.push({
          name: queueName,
          library: imp.source,
          type: queueConfig.type,
        });
      }
    }
  }

  return systems;
}
