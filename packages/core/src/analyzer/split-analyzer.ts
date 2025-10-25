import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
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
import { loadPatterns, type PatternConfig } from './pattern-loader.js';

/**
 * Maximum chunk size in bytes (256KB minified)
 */
const MAX_CHUNK_SIZE = 256 * 1024;

/**
 * Chunk file analyses into smaller files
 */
function chunkFileAnalyses(files: FileAnalysis[], dependencies: ModuleDependency[]): {
  chunks: { files: FileAnalysis[], dependencies: ModuleDependency[] }[];
  manifest: { chunkIndex: number; fileCount: number; files: string[] }[];
} {
  const chunks: { files: FileAnalysis[], dependencies: ModuleDependency[] }[] = [];
  const manifest: { chunkIndex: number; fileCount: number; files: string[] }[] = [];

  let currentChunk: FileAnalysis[] = [];
  let currentSize = 0;

  for (const file of files) {
    // Estimate size by serializing (minified = no spaces)
    const fileJson = JSON.stringify(file);
    const fileSize = Buffer.from(fileJson).length;

    // If adding this file would exceed limit, start new chunk
    if (currentChunk.length > 0 && currentSize + fileSize > MAX_CHUNK_SIZE) {
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
      currentSize = 0;
    }

    currentChunk.push(file);
    currentSize += fileSize;
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
 * Generate architecture diagram for a single service showing methods and their calls
 */
function generateServiceArchitectureDiagram(
  serviceName: string,
  serviceAnalyses: FileAnalysis[],
  serviceDeps: ModuleDependency[],
  layers: Record<Layer, LayerAnalysis | DataLayerAnalysis | APILayerAnalysis | ExternalLayerAnalysis>,
  patterns: PatternConfig
): string {
  const lines: string[] = [];

  lines.push(`# ${serviceName} - Architecture Diagram`);
  lines.push('');
  lines.push('```mermaid');
  lines.push('graph TB');
  lines.push('');

  // Create a map of file path to layer
  const fileToLayer = new Map<string, Layer>();
  for (const [layerName, layerData] of Object.entries(layers)) {
    for (const file of layerData.files) {
      fileToLayer.set(file.filePath, layerName as Layer);
    }
  }

  // Generate nodes for functions grouped by layer
  const functionIds = new Map<string, string>();
  let nodeCounter = 0;

  for (const [layerName, layerData] of Object.entries(layers)) {
    if (layerData.files.length === 0) continue;

    lines.push(`  subgraph ${layerName}_layer["${layerName.toUpperCase()} Layer"]`);

    // Add function nodes for this layer
    for (const file of layerData.files) {
      for (const func of file.functions) {
        const nodeId = `fn_${nodeCounter++}`;
        functionIds.set(`${file.filePath}::${func.name}`, nodeId);

        // Clean function name for display
        const displayName = func.name.length > 30 ? func.name.substring(0, 27) + '...' : func.name;
        lines.push(`    ${nodeId}["${displayName}"]`);
      }

      // Add class methods
      for (const cls of file.classes) {
        for (const method of cls.methods) {
          const nodeId = `fn_${nodeCounter++}`;
          functionIds.set(`${file.filePath}::${cls.name}.${method.name}`, nodeId);

          const displayName = `${cls.name}.${method.name}`.length > 30
            ? `${cls.name}.${method.name}`.substring(0, 27) + '...'
            : `${cls.name}.${method.name}`;
          lines.push(`    ${nodeId}["${displayName}"]`);
        }
      }
    }

    lines.push('  end');
    lines.push('');
  }

  // Add call relationships between functions
  lines.push('  %% Function calls');
  for (const file of serviceAnalyses) {
    for (const call of file.calls) {
      // Find source function
      let sourceFuncName: string | null = null;
      for (const func of file.functions) {
        if (call.location.startLine >= func.location.startLine &&
            call.location.startLine <= func.location.endLine) {
          sourceFuncName = `${file.filePath}::${func.name}`;
          break;
        }
      }

      if (!sourceFuncName) {
        // Check if call is within a class method
        for (const cls of file.classes) {
          for (const method of cls.methods) {
            if (call.location.startLine >= method.location.startLine &&
                call.location.startLine <= method.location.endLine) {
              sourceFuncName = `${file.filePath}::${cls.name}.${method.name}`;
              break;
            }
          }
          if (sourceFuncName) break;
        }
      }

      if (!sourceFuncName) continue;

      // Find target function in dependencies
      for (const dep of serviceDeps) {
        if (dep.source === file.filePath && dep.importedNames.includes(call.calleeName)) {
          // Find the target file
          const targetFile = serviceAnalyses.find(f => f.filePath === dep.target);
          if (!targetFile) continue;

          // Check if it's a function
          const targetFunc = targetFile.functions.find(f => f.name === call.calleeName);
          if (targetFunc) {
            const targetFuncName = `${targetFile.filePath}::${targetFunc.name}`;
            const sourceId = functionIds.get(sourceFuncName);
            const targetId = functionIds.get(targetFuncName);

            if (sourceId && targetId) {
              lines.push(`  ${sourceId} --> ${targetId}`);
            }
          }

          // Check if it's a class method
          for (const cls of targetFile.classes) {
            const method = cls.methods.find(m => m.name === call.calleeName);
            if (method) {
              const targetFuncName = `${targetFile.filePath}::${cls.name}.${method.name}`;
              const sourceId = functionIds.get(sourceFuncName);
              const targetId = functionIds.get(targetFuncName);

              if (sourceId && targetId) {
                lines.push(`  ${sourceId} --> ${targetId}`);
              }
            }
          }
        }
      }
    }
  }

  lines.push('');

  // Add databases
  if (layers.data) {
    const dataLayer = layers.data as DataLayerAnalysis;
    if (dataLayer.databases && Object.keys(dataLayer.databases).length > 0) {
      lines.push('  %% Databases');
      for (const dbType of Object.keys(dataLayer.databases)) {
        const dbConfig = patterns.databases[dbType];
        if (dbConfig) {
          const dbId = `DB_${dbType}`.replace(/[^a-zA-Z0-9]/g, '_');
          lines.push(`  ${dbId}${dbConfig.icon}`);
          lines.push(`  style ${dbId} fill:${dbConfig.color},stroke:#333,stroke-width:2px,color:#fff`);
        }
      }
      lines.push('');
    }
  }

  // Add external services
  if (layers.external) {
    const externalLayer = layers.external as ExternalLayerAnalysis;
    if (externalLayer.externalServices && Object.keys(externalLayer.externalServices).length > 0) {
      lines.push('  %% External Services');
      for (const extServices of Object.values(externalLayer.externalServices)) {
        for (const svcName of extServices) {
          const svcId = `EXT_${svcName}`.replace(/[^a-zA-Z0-9]/g, '_');
          lines.push(`  ${svcId}["${svcName}"]`);
          lines.push(`  style ${svcId} fill:#f9f,stroke:#333,stroke-width:2px`);
        }
      }
      lines.push('');
    }
  }

  lines.push('```');

  return lines.join('\n');
}

/**
 * Generate sequence diagram showing cross-service interactions
 */
function generateSequenceDiagram(
  services: ReturnType<typeof detectServices>,
  dependencies: ModuleDependency[]
): string {
  const lines: string[] = [];

  lines.push('# Cross-Service Interaction Diagram');
  lines.push('');
  lines.push('```mermaid');
  lines.push('sequenceDiagram');
  lines.push('  participant Client');

  // Add service participants
  for (const service of services) {
    const serviceName = service.name.replace(/[^a-zA-Z0-9]/g, '_');
    lines.push(`  participant ${serviceName} as ${service.name}`);
  }

  lines.push('');
  lines.push('  %% Cross-service interactions');

  if (services.length === 1) {
    // Single service - show simple flow
    const serviceId = services[0]?.name.replace(/[^a-zA-Z0-9]/g, '_');
    if (serviceId) {
      lines.push(`  Client->>+${serviceId}: Request`);
      lines.push(`  ${serviceId}-->>-Client: Response`);
    }
  } else {
    // Multi-service - show cross-service calls
    const firstServiceId = services[0]?.name.replace(/[^a-zA-Z0-9]/g, '_');
    if (firstServiceId) {
      lines.push(`  Client->>+${firstServiceId}: Request`);
    }

    // Find cross-service dependencies
    const crossServiceDeps = dependencies.filter(dep => {
      const sourceService = services.find(s => s.files.includes(dep.source));
      const targetService = services.find(s => s.files.includes(dep.target));
      return sourceService && targetService && sourceService.name !== targetService.name;
    });

    // Group by source/target service pairs
    const servicePairs = new Map<string, number>();
    for (const dep of crossServiceDeps) {
      const sourceService = services.find(s => s.files.includes(dep.source));
      const targetService = services.find(s => s.files.includes(dep.target));
      if (sourceService && targetService) {
        const key = `${sourceService.name} -> ${targetService.name}`;
        servicePairs.set(key, (servicePairs.get(key) || 0) + 1);
      }
    }

    // Show interactions between services
    for (const [pair, count] of servicePairs.entries()) {
      const parts = pair.split(' -> ');
      const source = parts[0];
      const target = parts[1];
      if (source && target) {
        const sourceId = source.replace(/[^a-zA-Z0-9]/g, '_');
        const targetId = target.replace(/[^a-zA-Z0-9]/g, '_');
        lines.push(`  ${sourceId}->>+${targetId}: Call (${count} dependencies)`);
        lines.push(`  ${targetId}-->>-${sourceId}: Response`);
      }
    }

    if (firstServiceId) {
      lines.push(`  ${firstServiceId}-->>-Client: Response`);
    }
  }

  lines.push('```');

  return lines.join('\n');
}

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

    // Generate service architecture diagram
    const serviceDiagram = generateServiceArchitectureDiagram(
      service.name,
      serviceAnalyses,
      serviceDeps,
      layers,
      patterns
    );
    writeFileSync(join(serviceDir, 'architecture-diagram.sm'), serviceDiagram, 'utf-8');
    console.log(`  ✓ architecture-diagram.sm`);

    serviceMetadata.push(metadata);
  }

  // 4. Calculate cross-service dependencies (files from different services)
  const crossServiceDeps = dependencies.filter(dep => {
    const sourceService = services.find(s => s.files.includes(dep.source));
    const targetService = services.find(s => s.files.includes(dep.target));
    return sourceService && targetService && sourceService.name !== targetService.name;
  });

  const crossServiceSummary: Record<string, number> = {};
  for (const dep of crossServiceDeps) {
    const sourceService = services.find(s => s.files.includes(dep.source))?.name || 'unknown';
    const targetService = services.find(s => s.files.includes(dep.target))?.name || 'unknown';
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

  // 7. Generate cross-service sequence diagram
  console.log('\nGenerating cross-service sequence diagram...');

  const sequenceDiagram = generateSequenceDiagram(services, dependencies);
  writeFileSync(join(outputDir, 'sequence-diagram.sm'), sequenceDiagram, 'utf-8');
  console.log('  ✓ sequence-diagram.sm');

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
