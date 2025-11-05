/**
 * @specmind/core - Code analysis and architecture generation using tree-sitter
 *
 * This package provides pure logic for analyzing codebases and extracting
 * architecture information. It has no CLI or UI dependencies.
 */

// Export types
export type {
  SupportedLanguage,
  SourceLocation,
  Parameter,
  FunctionDefinition,
  MethodDefinition,
  PropertyDefinition,
  ClassDefinition,
  ImportStatement,
  ExportStatement,
  FileAnalysis,
  ModuleDependency,
  CodebaseAnalysis,
  AnalysisOptions,
  // Split analysis types
  Layer,
  LayerDetectionResult,
  CrossLayerDependency,
  DatabaseDetection,
  APIEndpoint,
  ExternalService,
  MessageSystem,
  LayerAnalysis,
  DataLayerAnalysis,
  APILayerAnalysis,
  ExternalLayerAnalysis,
  ServiceMetadata,
  SplitAnalysisMetadata,
  // Entity types
  Entity,
  EntityField,
  Relationship,
  EntityGroup,
  EntityDetectionResult,
  EntityDetector,
  RelationshipType,
} from './types/index.js'

// Export schemas for runtime validation
export {
  SourceLocationSchema,
  ParameterSchema,
  FunctionDefinitionSchema,
  MethodDefinitionSchema,
  PropertyDefinitionSchema,
  ClassDefinitionSchema,
  ImportStatementSchema,
  ExportStatementSchema,
  FileAnalysisSchema,
  ModuleDependencySchema,
  CodebaseAnalysisSchema,
  AnalysisOptionsSchema,
} from './types/index.js'

// Export analyzer functions
export { analyzeFile, analyzeFileContent } from './analyzer/file-analyzer.js'
export { buildDependencyGraph, findEntryPoints } from './analyzer/dependency-graph.js'

// Export language utilities
export {
  detectLanguage,
  getLanguageConfig,
  TYPESCRIPT_CONFIG,
  JAVASCRIPT_CONFIG,
} from './analyzer/language-config.js'

// Export parser utilities
export { getParser, parseCode, parseFile } from './analyzer/parser.js'

// Export individual extractors (for advanced use cases)
export { extractFunctions } from './analyzer/extractors/functions.js'
export { extractClasses } from './analyzer/extractors/classes.js'
export { extractImports, extractExports } from './analyzer/extractors/imports.js'
export { extractEntities, shouldExtractEntities } from './analyzer/extractors/entities.js'

// Export generator functions
export {
  generateClassDiagram,
  generateComponentDiagram,
  generateSequenceDiagram,
  type DiagramOptions,
} from './generator/index.js'

// Export split analysis functions
export { performSplitAnalysis } from './analyzer/split-analyzer.js'
export { detectLayers, detectDatabaseType, detectExternalServices, detectMessageSystems } from './analyzer/layer-detector.js'
export { detectServices, type Service } from './analyzer/service-detector.js'
export { loadPatterns, loadPatternsWithOverrides, type PatternConfig } from './analyzer/pattern-loader.js'

