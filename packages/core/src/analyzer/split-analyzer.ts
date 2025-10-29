import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { getEncoding } from 'js-tiktoken';
import type {
  FileAnalysis,
  ModuleDependency,
  Layer,
  CrossLayerDependency,
  LayerAnalysis,
  DataLayerAnalysis,
  APILayerAnalysis,
  ExternalLayerAnalysis,
  SplitAnalysisMetadata,
  ServiceMetadata,
} from '../types/index.js';
import { detectLayers, detectDatabaseType, detectExternalServices, detectMessageSystems } from './layer-detector.js';
import { detectServices } from './service-detector.js';
import { loadPatterns } from './pattern-loader.js';

/**
 * Maximum chunk size in tokens
 *
 * Conservative limit of 18K tokens (7K buffer for Claude's 25K Read tool limit)
 *
 * Note: We use tiktoken's cl100k_base encoding as a universal approximation.
 * While different LLM providers (Claude, GPT-4, Gemini) use different tokenizers,
 * tiktoken provides a reasonably accurate estimate that works across providers.
 * The large safety margin accounts for tokenization differences.
 */
const MAX_CHUNK_TOKENS = 18000;

// Initialize tokenizer (lazily loaded on first use)
let tokenizer: ReturnType<typeof getEncoding> | null = null;

/**
 * Count tokens using tiktoken (provider-agnostic approximation)
 */
function countTokens(text: string): number {
  if (!tokenizer) {
    tokenizer = getEncoding('cl100k_base');
  }
  const tokens = tokenizer.encode(text);
  return tokens.length;
}

/**
 * Chunk file analyses into smaller files
 */
function chunkFileAnalyses(files: FileAnalysis[], dependencies: ModuleDependency[]): {
  chunks: { files: FileAnalysis[], dependencies: ModuleDependency[] }[];
  manifest: { chunkIndex: number; fileCount: number; files: string[] }[] ;
} {
  const chunks: { files: FileAnalysis[], dependencies: ModuleDependency[] }[] = [];
  const manifest: { chunkIndex: number; fileCount: number; files: string[] }[] = [];

  let currentChunk: FileAnalysis[] = [];
  let currentTokens = 0;

  for (const file of files) {
    // Count tokens accurately using tiktoken
    const fileJson = JSON.stringify(file);
    const fileTokens = countTokens(fileJson);

    // If adding this file would exceed limit, start new chunk
    if (currentChunk.length > 0 && currentTokens + fileTokens > MAX_CHUNK_TOKENS) {
      // Finalize current chunk
      const chunkDeps = dependencies.filter(dep =>
        currentChunk.some(f => f.filePath === dep.source) &&
        currentChunk.some(f => f.filePath === dep.target)
      );

      chunks.push({ files: currentChunk, dependencies: chunkDeps });
      manifest.push({
        chunkIndex: chunks.length - 1,
        fileCount: currentChunk.length,
        files: currentChunk.map(f => f.filePath),
      });

      // Start new chunk
      currentChunk = [];
      currentTokens = 0;
    }

    currentChunk.push(file);
    currentTokens += fileTokens;
  }

  // Add final chunk if not empty
  if (currentChunk.length > 0) {
    const chunkDeps = dependencies.filter(dep =>
      currentChunk.some(f => f.filePath === dep.source) &&
      currentChunk.some(f => f.filePath === dep.target)
    );

    chunks.push({ files: currentChunk, dependencies: chunkDeps });
    manifest.push({
      chunkIndex: chunks.length - 1,
      fileCount: currentChunk.length,
      files: currentChunk.map(f => f.filePath),
    });
  }

  return { chunks, manifest };
}

/**
 * Extract HTTP-based cross-service dependencies
 * Maps HTTP calls to target services based on URL patterns
 */
function extractHttpDependencies(
  analyses: FileAnalysis[],
  services: ReturnType<typeof detectServices>
): ModuleDependency[] {
  const httpDeps: ModuleDependency[] = [];

  for (const analysis of analyses) {
    const sourceService = services.find(s => s.files.includes(analysis.filePath));
    if (!sourceService) continue;

    // Skip if httpCalls doesn't exist (for backward compatibility with tests)
    if (!analysis.httpCalls) continue;

    for (const httpCall of analysis.httpCalls) {
      // Try to match URL to a target service
      const targetService = matchUrlToService(httpCall.url, services);

      if (targetService && targetService.name !== sourceService.name) {
        // Found a cross-service HTTP call!
        httpDeps.push({
          source: analysis.filePath,
          target: targetService.name, // Use service name as target
          importedNames: [httpCall.method], // Store HTTP method
        });
      }
    }
  }

  return httpDeps;
}

/**
 * Match a URL pattern to a target service
 * Looks for service name in URL or infers from service type and URL patterns
 */
function matchUrlToService(
  url: string,
  services: ReturnType<typeof detectServices>
): typeof services[0] | null {
  const urlLower = url.toLowerCase();

  // First, try direct service name matching
  for (const service of services) {
    const serviceName = service.name.toLowerCase();
    const serviceBaseName = serviceName.split('-')[0]; // e.g., "email" from "email-service"

    // Check if service name appears in URL
    // e.g., "http://email-service:3000/api/send" -> matches "email-service"
    // e.g., "${baseUrl}/api/email/send-template" -> matches "email"
    if (
      urlLower.includes(serviceName) ||
      urlLower.includes(`/${serviceName}/`) ||
      urlLower.includes(`/api/${serviceBaseName}/`)
    ) {
      return service;
    }
  }

  // If no direct match, infer from URL pattern and service types
  // Generic API paths like /api/tasks, /api/users likely target the main API service
  if (urlLower.startsWith('/api/') || urlLower.includes('`/api/')) {
    // Find services of type "api-server" (excluding frontend services)
    const apiServers = services.filter(s => s.type === 'api-server');

    // If there's only one API server, it's likely the target
    if (apiServers.length === 1) {
      return apiServers[0]!;
    }

    // If multiple API servers, prefer the one with "api" in its name
    const apiService = apiServers.find(s => s.name.toLowerCase().includes('api'));
    if (apiService) {
      return apiService;
    }

    // Fallback to first API server
    if (apiServers.length > 0) {
      return apiServers[0]!;
    }
  }

  return null;
}

// Sequence diagram generation removed - diagrams will be generated via AI prompt

/**
 * Perform split analysis on a codebase
 * Automatically detects services and splits by layers with chunking
 */
export async function performSplitAnalysis(
  rootPath: string,
  analyses: FileAnalysis[],
  dependencies: ModuleDependency[],
  outputDir: string = '.specmind/system'
): Promise<void> {
  const patterns = loadPatterns();

  // 1. Detect all services
  const allFiles = analyses.map(a => a.filePath);
  const services = detectServices(rootPath, allFiles);
  const isMultiService = services.length > 1;

  console.log(`\nDetected ${services.length} service(s)`);
  console.log(`Architecture: ${isMultiService ? 'microservices' : 'monolith'}`);

  // 2. Create file-to-layer mapping
  const fileLayerMap = new Map<string, Layer[]>();
  for (const analysis of analyses) {
    const detection = detectLayers(analysis, patterns);
    fileLayerMap.set(analysis.filePath, detection.layers);
  }

  // 3. Process each service
  const serviceMetadata: ServiceMetadata[] = [];
  const allCrossLayerDeps: CrossLayerDependency[] = [];

  for (const service of services) {
    console.log(`\nProcessing service: ${service.name}`);

    const serviceAnalyses = analyses.filter(a => service.files.includes(a.filePath));
    const serviceDeps = dependencies.filter(dep =>
      service.files.includes(dep.source) && service.files.includes(dep.target)
    );

    // Split service by layers
    const layers = splitByLayers(serviceAnalyses, serviceDeps, fileLayerMap, patterns);

    // Collect cross-layer dependencies
    for (const layer of Object.values(layers)) {
      allCrossLayerDeps.push(...layer.crossLayerDependencies);
    }

    // Write service layer files (chunked)
    const serviceDir = join(outputDir, 'services', service.name);
    mkdirSync(serviceDir, { recursive: true });

    // Write each layer directory with chunks
    for (const [layerName, layerData] of Object.entries(layers)) {
      const layerDir = join(serviceDir, `${layerName}-layer`);
      mkdirSync(layerDir, { recursive: true });

      // Chunk the files
      const { chunks, manifest } = chunkFileAnalyses(layerData.files, layerData.dependencies);

      // Write chunk files (minified)
      for (let i = 0; i < chunks.length; i++) {
        const chunkPath = join(layerDir, `chunk-${i}.json`);
        writeFileSync(chunkPath, JSON.stringify(chunks[i]), 'utf-8'); // No spaces = minified
      }

      // Write summary file (pretty-printed)
      const summary = {
        layer: layerData.layer,
        totalFiles: layerData.files.length,
        totalChunks: chunks.length,
        chunkManifest: manifest,
        summary: layerData.summary,
        crossLayerDependencies: layerData.crossLayerDependencies,
        // Layer-specific data
        ...(layerName === 'data' && (layerData as DataLayerAnalysis).databases
          ? { databases: (layerData as DataLayerAnalysis).databases }
          : {}),
        ...(layerName === 'api' && (layerData as APILayerAnalysis).endpoints
          ? { endpoints: (layerData as APILayerAnalysis).endpoints }
          : {}),
        ...(layerName === 'external' && (layerData as ExternalLayerAnalysis).externalServices
          ? {
              externalServices: (layerData as ExternalLayerAnalysis).externalServices,
              messageSystems: (layerData as ExternalLayerAnalysis).messageSystems,
            }
          : {}),
      };

      const summaryPath = join(layerDir, 'summary.json');
      writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

      console.log(`  ✓ ${layerName}-layer/ (${layerData.files.length} files, ${chunks.length} chunks)`);
    }

    // Collect cross-layer dependencies for this service
    const serviceCrossLayerDeps = Object.values(layers).flatMap(layer => layer.crossLayerDependencies);

    // Write service metadata with cross-layer dependencies
    const metadata: ServiceMetadata = {
      name: service.name,
      rootPath: service.rootPath,
      entryPoint: service.entryPoint,
      type: service.type,
      framework: service.framework,
      port: service.port,
      filesAnalyzed: serviceAnalyses.length,
      layers: Object.keys(layers) as Layer[],
    };

    // Add cross-layer dependencies summary to service metadata
    const serviceCrossLayerSummary: Record<string, number> = {};
    for (const dep of serviceCrossLayerDeps) {
      serviceCrossLayerSummary[dep.direction] = (serviceCrossLayerSummary[dep.direction] || 0) + 1;
    }

    writeFileSync(
      join(serviceDir, 'metadata.json'),
      JSON.stringify({
        ...metadata,
        crossLayerDependencies: serviceCrossLayerSummary,
      }, null, 2),
      'utf-8'
    );


    serviceMetadata.push(metadata);
  }

  // 4. Calculate cross-service dependencies (files from different services)
  // This includes both import/export dependencies and HTTP call dependencies
  const crossServiceDeps = dependencies.filter(dep => {
    const sourceService = services.find(s => s.files.includes(dep.source));
    const targetService = services.find(s => s.files.includes(dep.target));
    return sourceService && targetService && sourceService.name !== targetService.name;
  });

  // Extract HTTP-based cross-service dependencies
  const httpDependencies = extractHttpDependencies(analyses, services);

  // Merge HTTP dependencies with regular dependencies for the summary
  const allCrossServiceDeps = [...crossServiceDeps, ...httpDependencies];

  const crossServiceSummary: Record<string, number> = {};
  for (const dep of allCrossServiceDeps) {
    const sourceService = services.find(s => s.files.includes(dep.source))?.name || 'unknown';
    // For HTTP deps, target is already a service name; for regular deps, it's a file path
    const targetService = dep.target.includes('/')
      ? services.find(s => s.files.includes(dep.target))?.name || 'unknown'
      : dep.target; // Already a service name from HTTP deps
    const key = `${sourceService} -> ${targetService}`;
    crossServiceSummary[key] = (crossServiceSummary[key] || 0) + 1;
  }

  // 5. Generate cross-layer dependency summary and detect violations
  const globalLayers = splitByLayers(analyses, dependencies, fileLayerMap, patterns);
  const { summary: crossLayerSummary, violations } = analyzeCrossLayerDependencies(globalLayers);

  // 6. Write root metadata with cross-service dependencies
  const metadata: SplitAnalysisMetadata = {
    analyzedAt: new Date().toISOString(),
    rootPath,
    architecture: isMultiService ? 'microservices' : 'monolith',
    services: serviceMetadata,
    layers: {
      data: globalLayers.data ? {
        filesAnalyzed: globalLayers.data.files.length,
        databases: (globalLayers.data as DataLayerAnalysis).databases
          ? Object.keys((globalLayers.data as DataLayerAnalysis).databases!)
          : undefined,
        totalModels: (globalLayers.data as DataLayerAnalysis).summary.totalModels,
      } : undefined,
      api: globalLayers.api ? {
        filesAnalyzed: globalLayers.api.files.length,
        totalEndpoints: (globalLayers.api as APILayerAnalysis).summary.totalEndpoints,
        frameworks: (globalLayers.api as APILayerAnalysis).summary.frameworks,
      } : undefined,
      service: globalLayers.service ? {
        filesAnalyzed: globalLayers.service.files.length,
        totalFunctions: (globalLayers.service as LayerAnalysis).summary.totalFunctions || 0,
        totalClasses: (globalLayers.service as LayerAnalysis).summary.totalClasses || 0,
      } : undefined,
      external: globalLayers.external ? {
        filesAnalyzed: globalLayers.external.files.length,
        services: (globalLayers.external as ExternalLayerAnalysis).summary.serviceTypes,
      } : undefined,
    },
    totals: {
      filesAnalyzed: analyses.length,
      totalFunctions: analyses.reduce((sum, a) => sum + a.functions.length, 0),
      totalClasses: analyses.reduce((sum, a) => sum + a.classes.length, 0),
      totalCalls: analyses.reduce((sum, a) => sum + a.calls.length, 0),
      languages: [...new Set(analyses.map(a => a.language))],
    },
    crossLayerDependencies: crossLayerSummary,
    violations: violations.length > 0 ? violations : undefined,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'metadata.json'),
    JSON.stringify({
      ...metadata,
      crossServiceDependencies: crossServiceSummary,
    }, null, 2),
    'utf-8'
  );


  console.log(`\n✅ Split analysis complete: ${outputDir}`);
  console.log(`   Services: ${services.length}`);
  console.log(`   Files: ${analyses.length}`);
  console.log(`   Layers: ${Object.keys(globalLayers).join(', ')}`);

  if (violations.length > 0) {
    console.log(`\n⚠️  Architecture violations detected: ${violations.length}`);
  }
}

/**
 * Split analyses by layers
 */
function splitByLayers(
  analyses: FileAnalysis[],
  dependencies: ModuleDependency[],
  fileLayerMap: Map<string, Layer[]>,
  patterns: ReturnType<typeof loadPatterns>
): Record<Layer, LayerAnalysis | DataLayerAnalysis | APILayerAnalysis | ExternalLayerAnalysis> {
  const layers: any = {
    data: { layer: 'data', files: [], dependencies: [], crossLayerDependencies: [], summary: { totalFiles: 0 }, databases: {} },
    api: { layer: 'api', files: [], dependencies: [], crossLayerDependencies: [], summary: { totalFiles: 0 } },
    service: { layer: 'service', files: [], dependencies: [], crossLayerDependencies: [], summary: { totalFiles: 0 } },
    external: { layer: 'external', files: [], dependencies: [], crossLayerDependencies: [], summary: { totalFiles: 0 }, externalServices: {}, messageSystems: {} },
  };

  // Assign files to layers
  for (const analysis of analyses) {
    const fileLayers = fileLayerMap.get(analysis.filePath) || [];

    for (const layer of fileLayers) {
      layers[layer].files.push(analysis);

      // Detect layer-specific information
      if (layer === 'data') {
        const dbType = detectDatabaseType(analysis, patterns);
        if (dbType) {
          if (!layers.data.databases[dbType.type]) {
            layers.data.databases[dbType.type] = {
              type: dbType.type,
              driver: dbType.driver,
              orm: dbType.orm,
              files: [],
              totalModels: 0,
            };
          }
          layers.data.databases[dbType.type].files.push(analysis.filePath);
          layers.data.databases[dbType.type].totalModels += analysis.classes.length;
        }
      } else if (layer === 'external') {
        const services = detectExternalServices(analysis, patterns);
        for (const svc of services) {
          if (!layers.external.externalServices[svc.type]) {
            layers.external.externalServices[svc.type] = [];
          }
          if (!layers.external.externalServices[svc.type].includes(svc.name)) {
            layers.external.externalServices[svc.type].push(svc.name);
          }
        }

        const msgSystems = detectMessageSystems(analysis, patterns);
        for (const msg of msgSystems) {
          if (!layers.external.messageSystems[msg.name]) {
            layers.external.messageSystems[msg.name] = {
              library: msg.library,
              files: [],
              type: msg.type,
            };
          }
          layers.external.messageSystems[msg.name].files.push(analysis.filePath);
        }
      }
    }
  }

  // Categorize dependencies
  for (const dep of dependencies) {
    const sourceLayers = fileLayerMap.get(dep.source) || [];
    const targetLayers = fileLayerMap.get(dep.target) || [];

    for (const sourceLayer of sourceLayers) {
      // Check if same layer or cross-layer
      if (targetLayers.includes(sourceLayer)) {
        // Internal dependency (same layer)
        layers[sourceLayer].dependencies.push(dep);
      } else {
        // Cross-layer dependency
        for (const targetLayer of targetLayers) {
          const crossDep: CrossLayerDependency = {
            source: dep.source,
            target: dep.target,
            targetLayer,
            importedNames: dep.importedNames,
            type: 'uses',
            direction: `${sourceLayer} -> ${targetLayer}`,
          };
          layers[sourceLayer].crossLayerDependencies.push(crossDep);
        }
      }
    }
  }

  // Calculate summaries
  layers.data.summary = {
    totalFiles: layers.data.files.length,
    totalModels: Object.values(layers.data.databases).reduce((sum: number, db: any) => sum + db.totalModels, 0),
    totalQueries: 0, // TODO: detect queries
    databaseTypes: Object.keys(layers.data.databases),
    orms: [...new Set(Object.values(layers.data.databases).map((db: any) => db.orm).filter(Boolean))],
  };

  layers.api.summary = {
    totalFiles: layers.api.files.length,
    totalEndpoints: 0, // TODO: extract endpoints
    frameworks: [], // TODO: detect frameworks
    methods: {}, // TODO: count methods
  };

  const serviceTotalFunctions = layers.service.files.reduce((sum: number, f: FileAnalysis) => sum + f.functions.length, 0);
  const serviceTotalClasses = layers.service.files.reduce((sum: number, f: FileAnalysis) => sum + f.classes.length, 0);

  layers.service.summary = {
    totalFiles: layers.service.files.length,
    totalFunctions: serviceTotalFunctions,
    totalClasses: serviceTotalClasses,
  };

  layers.external.summary = {
    totalFiles: layers.external.files.length,
    totalExternalServices: Object.values(layers.external.externalServices).flat().length,
    totalMessageSystems: Object.keys(layers.external.messageSystems).length,
    serviceTypes: Object.keys(layers.external.externalServices),
    messagingTypes: [...new Set(Object.values(layers.external.messageSystems).map((m: any) => m.type))],
  };

  return layers;
}

/**
 * Analyze cross-layer dependencies and detect violations
 */
function analyzeCrossLayerDependencies(
  layers: Record<Layer, LayerAnalysis>
): { summary: Record<string, number>; violations: any[] } {
  const summary: Record<string, number> = {};
  const violations: any[] = [];

  // Expected dependency directions (clean architecture)
  const allowedDirections = new Set([
    'api -> service',
    'api -> data',
    'service -> data',
    'service -> external',
    'external -> service',
    'external -> data',
  ]);

  for (const layer of Object.values(layers)) {
    for (const dep of layer.crossLayerDependencies) {
      const direction = dep.direction;

      // Count
      summary[direction] = (summary[direction] || 0) + 1;

      // Check for violations
      if (!allowedDirections.has(direction)) {
        const violation = {
          type: 'reversed-dependency',
          from: direction.split(' -> ')[0],
          to: direction.split(' -> ')[1],
          files: [{
            source: dep.source,
            target: dep.target,
            reason: `${direction.split(' -> ')[0]} layer should not depend on ${direction.split(' -> ')[1]} layer`,
          }],
        };

        // Check if we already have this violation type
        const existing = violations.find(v =>
          v.type === violation.type && v.from === violation.from && v.to === violation.to
        );

        if (existing) {
          existing.files.push(violation.files[0]);
        } else {
          violations.push(violation);
        }
      }
    }
  }

  return { summary, violations };
}
