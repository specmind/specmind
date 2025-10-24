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
import { loadPatterns } from './pattern-loader.js';

/**
 * Perform split analysis on a codebase
 * Automatically detects services and splits by layers
 */
export async function performSplitAnalysis(
  rootPath: string,
  analyses: FileAnalysis[],
  dependencies: ModuleDependency[],
  outputDir: string = '.specmind/analysis'
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

  for (const service of services) {
    console.log(`\nProcessing service: ${service.name}`);

    const serviceAnalyses = analyses.filter(a => service.files.includes(a.filePath));
    const serviceDeps = dependencies.filter(dep =>
      service.files.includes(dep.source) && service.files.includes(dep.target)
    );

    // Split service by layers
    const layers = splitByLayers(serviceAnalyses, serviceDeps, fileLayerMap, patterns);

    // Write service layer files
    const serviceDir = join(outputDir, 'services', service.name);
    mkdirSync(serviceDir, { recursive: true });

    // Write each layer file
    for (const [layerName, layerData] of Object.entries(layers)) {
      const filePath = join(serviceDir, `${layerName}-layer.json`);
      writeFileSync(filePath, JSON.stringify(layerData, null, 2), 'utf-8');
      console.log(`  ✓ ${layerName}-layer.json (${layerData.files.length} files)`);
    }

    // Write service metadata
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

    writeFileSync(
      join(serviceDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
      'utf-8'
    );

    serviceMetadata.push(metadata);
  }

  // 4. Create cross-service layer view (global layers)
  console.log('\nCreating cross-service layer view...');
  const globalLayers = splitByLayers(analyses, dependencies, fileLayerMap, patterns);

  const layersDir = join(outputDir, 'layers');
  mkdirSync(layersDir, { recursive: true });

  for (const [layerName, layerData] of Object.entries(globalLayers)) {
    const filePath = join(layersDir, `${layerName}-layer.json`);
    writeFileSync(filePath, JSON.stringify(layerData, null, 2), 'utf-8');
    console.log(`  ✓ ${layerName}-layer.json (${layerData.files.length} files)`);
  }

  // 5. Generate cross-layer dependency summary and detect violations
  const { summary, violations } = analyzeCrossLayerDependencies(globalLayers);

  // 6. Write root metadata
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
    crossLayerDependencies: summary,
    violations: violations.length > 0 ? violations : undefined,
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(
    join(outputDir, 'metadata.json'),
    JSON.stringify(metadata, null, 2),
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
