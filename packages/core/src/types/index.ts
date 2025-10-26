import { z } from 'zod'

/**
 * Source location information for code elements
 */
export const SourceLocationSchema = z.object({
  filePath: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  startColumn: z.number().optional(),
  endColumn: z.number().optional(),
})

export type SourceLocation = z.infer<typeof SourceLocationSchema>

/**
 * Function parameter information
 */
export const ParameterSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  optional: z.boolean().default(false),
  defaultValue: z.string().optional(),
})

export type Parameter = z.infer<typeof ParameterSchema>

/**
 * Function/method definition
 */
export const FunctionDefinitionSchema = z.object({
  name: z.string(),
  qualifiedName: z.string(), // e.g., "MyClass.myMethod" or "myFunction"
  parameters: z.array(ParameterSchema),
  returnType: z.string().optional(),
  isExported: z.boolean().default(false),
  isAsync: z.boolean().default(false),
  location: SourceLocationSchema,
  docComment: z.string().optional(),
})

export type FunctionDefinition = z.infer<typeof FunctionDefinitionSchema>

/**
 * Class method definition
 */
export const MethodDefinitionSchema = FunctionDefinitionSchema.extend({
  visibility: z.enum(['public', 'private', 'protected']).default('public'),
  isStatic: z.boolean().default(false),
  isAbstract: z.boolean().default(false),
})

export type MethodDefinition = z.infer<typeof MethodDefinitionSchema>

/**
 * Class property definition
 */
export const PropertyDefinitionSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  visibility: z.enum(['public', 'private', 'protected']).default('public'),
  isStatic: z.boolean().default(false),
  isReadonly: z.boolean().default(false),
  location: SourceLocationSchema,
})

export type PropertyDefinition = z.infer<typeof PropertyDefinitionSchema>

/**
 * Class/interface definition
 */
export const ClassDefinitionSchema = z.object({
  name: z.string(),
  qualifiedName: z.string(),
  kind: z.enum(['class', 'interface', 'type', 'enum']),
  isExported: z.boolean().default(false),
  isAbstract: z.boolean().default(false),
  extendsFrom: z.array(z.string()).default([]),
  implements: z.array(z.string()).default([]),
  methods: z.array(MethodDefinitionSchema).default([]),
  properties: z.array(PropertyDefinitionSchema).default([]),
  location: SourceLocationSchema,
  docComment: z.string().optional(),
})

export type ClassDefinition = z.infer<typeof ClassDefinitionSchema>

/**
 * Import statement
 */
export const ImportStatementSchema = z.object({
  source: z.string(), // Module path: './utils', 'react', etc.
  imports: z.array(
    z.object({
      name: z.string(), // Imported name
      alias: z.string().optional(), // Alias if renamed
      isDefault: z.boolean().default(false),
      isNamespace: z.boolean().default(false), // import * as name
    })
  ),
  location: SourceLocationSchema,
})

export type ImportStatement = z.infer<typeof ImportStatementSchema>

/**
 * Export statement
 */
export const ExportStatementSchema = z.object({
  name: z.string(),
  isDefault: z.boolean().default(false),
  source: z.string().optional(), // Re-export source if applicable
  location: SourceLocationSchema,
})

export type ExportStatement = z.infer<typeof ExportStatementSchema>

/**
 * Function or method call
 */
export const CallExpressionSchema = z.object({
  callerName: z.string(), // Name of the function/method that makes the call
  callerQualifiedName: z.string(), // Fully qualified name (e.g., "ClassName.methodName")
  calleeName: z.string(), // Name of the function/method being called
  calleeQualifiedName: z.string().optional(), // Fully qualified name if available
  arguments: z.array(z.string()).default([]), // Argument expressions as strings
  location: SourceLocationSchema,
  isMethodCall: z.boolean().default(false), // true if calling on an object (obj.method())
  receiver: z.string().optional(), // For method calls, the object/class being called on
})

export type CallExpression = z.infer<typeof CallExpressionSchema>

/**
 * HTTP/External service call
 */
export const HttpCallSchema = z.object({
  callerName: z.string(), // Function making the HTTP call
  callerQualifiedName: z.string(),
  method: z.string(), // GET, POST, etc.
  url: z.string(), // URL pattern or template string
  location: SourceLocationSchema,
  clientType: z.enum(['fetch', 'axios', 'http', 'unknown']).default('unknown'),
})

export type HttpCall = z.infer<typeof HttpCallSchema>

/**
 * File analysis result
 */
export const FileAnalysisSchema = z.object({
  filePath: z.string(),
  language: z.enum(['typescript', 'javascript', 'python']),
  functions: z.array(FunctionDefinitionSchema).default([]),
  classes: z.array(ClassDefinitionSchema).default([]),
  imports: z.array(ImportStatementSchema).default([]),
  exports: z.array(ExportStatementSchema).default([]),
  calls: z.array(CallExpressionSchema).default([]),
  httpCalls: z.array(HttpCallSchema).default([]),
})

export type FileAnalysis = z.infer<typeof FileAnalysisSchema>

/**
 * Module dependency
 */
export const ModuleDependencySchema = z.object({
  source: z.string(), // The file that imports
  target: z.string(), // The file/module being imported
  importedNames: z.array(z.string()),
})

export type ModuleDependency = z.infer<typeof ModuleDependencySchema>

/**
 * Codebase analysis result
 */
export const CodebaseAnalysisSchema = z.object({
  rootPath: z.string(),
  files: z.array(FileAnalysisSchema),
  dependencies: z.array(ModuleDependencySchema),
  entryPoints: z.array(z.string()).default([]), // Main entry files
})

export type CodebaseAnalysis = z.infer<typeof CodebaseAnalysisSchema>

/**
 * Supported languages
 */
export type SupportedLanguage = 'typescript' | 'javascript' | 'python'

/**
 * Analysis options
 */
export const AnalysisOptionsSchema = z.object({
  rootPath: z.string(),
  include: z.array(z.string()).default(['**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx']),
  exclude: z.array(z.string()).default(['**/node_modules/**', '**/dist/**', '**/build/**']),
  followImports: z.boolean().default(true),
})

export type AnalysisOptions = z.infer<typeof AnalysisOptionsSchema>

/**
 * Architectural layer types
 */
export type Layer = 'data' | 'api' | 'service' | 'external'

/**
 * Layer detection result
 */
export const LayerDetectionResultSchema = z.object({
  layers: z.array(z.enum(['data', 'api', 'service', 'external'])),
  confidence: z.number().min(0).max(1),
  reasons: z.array(z.string()),
})

export type LayerDetectionResult = z.infer<typeof LayerDetectionResultSchema>

/**
 * Cross-layer dependency
 */
export const CrossLayerDependencySchema = z.object({
  source: z.string(), // Source file path
  target: z.string(), // Target file path
  targetLayer: z.enum(['data', 'api', 'service', 'external']),
  importedNames: z.array(z.string()),
  type: z.literal('uses'),
  direction: z.string(), // e.g., "api -> service"
})

export type CrossLayerDependency = z.infer<typeof CrossLayerDependencySchema>

/**
 * Database detection result
 */
export const DatabaseDetectionSchema = z.object({
  type: z.string(), // postgresql, mysql, redis, mongodb, etc.
  driver: z.string().optional(),
  orm: z.string().optional(),
  files: z.array(z.string()),
  totalModels: z.number().default(0),
})

export type DatabaseDetection = z.infer<typeof DatabaseDetectionSchema>

/**
 * API endpoint
 */
export const APIEndpointSchema = z.object({
  method: z.string(), // GET, POST, PUT, DELETE, etc.
  path: z.string(),
  handler: z.string(),
  location: SourceLocationSchema,
})

export type APIEndpoint = z.infer<typeof APIEndpointSchema>

/**
 * External service
 */
export const ExternalServiceSchema = z.object({
  name: z.string(),
  type: z.string(), // payment, messaging, cloud, ai, etc.
  sdk: z.string(),
})

export type ExternalService = z.infer<typeof ExternalServiceSchema>

/**
 * Message system
 */
export const MessageSystemSchema = z.object({
  library: z.string(),
  files: z.array(z.string()),
  type: z.string(), // message-queue, event-stream, task-queue, pub-sub
})

export type MessageSystem = z.infer<typeof MessageSystemSchema>

/**
 * Layer analysis output (per layer)
 */
export const LayerAnalysisSchema = z.object({
  layer: z.enum(['data', 'api', 'service', 'external']),
  files: z.array(FileAnalysisSchema),
  dependencies: z.array(ModuleDependencySchema), // Same-layer dependencies
  crossLayerDependencies: z.array(CrossLayerDependencySchema),
  summary: z.object({
    totalFiles: z.number(),
    totalFunctions: z.number().optional(),
    totalClasses: z.number().optional(),
  }),
})

export type LayerAnalysis = z.infer<typeof LayerAnalysisSchema>

/**
 * Data layer specific analysis
 */
export const DataLayerAnalysisSchema = LayerAnalysisSchema.extend({
  layer: z.literal('data'),
  databases: z.record(DatabaseDetectionSchema).optional(),
  summary: z.object({
    totalFiles: z.number(),
    totalModels: z.number().optional(),
    totalQueries: z.number().optional(),
    databaseTypes: z.array(z.string()).optional(),
    orms: z.array(z.string()).optional(),
  }),
})

export type DataLayerAnalysis = z.infer<typeof DataLayerAnalysisSchema>

/**
 * API layer specific analysis
 */
export const APILayerAnalysisSchema = LayerAnalysisSchema.extend({
  layer: z.literal('api'),
  endpoints: z.array(APIEndpointSchema).optional(),
  summary: z.object({
    totalFiles: z.number(),
    totalEndpoints: z.number().optional(),
    frameworks: z.array(z.string()).optional(),
    methods: z.record(z.number()).optional(), // { GET: 10, POST: 5, ... }
  }),
})

export type APILayerAnalysis = z.infer<typeof APILayerAnalysisSchema>

/**
 * External layer specific analysis
 */
export const ExternalLayerAnalysisSchema = LayerAnalysisSchema.extend({
  layer: z.literal('external'),
  externalServices: z.record(z.array(z.string())).optional(), // { payment: ['stripe'], cloud: ['aws-s3'] }
  messageSystems: z.record(MessageSystemSchema).optional(),
  summary: z.object({
    totalFiles: z.number(),
    totalExternalServices: z.number().optional(),
    totalMessageSystems: z.number().optional(),
    serviceTypes: z.array(z.string()).optional(),
    messagingTypes: z.array(z.string()).optional(),
  }),
})

export type ExternalLayerAnalysis = z.infer<typeof ExternalLayerAnalysisSchema>

/**
 * Service metadata
 */
export const ServiceMetadataSchema = z.object({
  name: z.string(),
  rootPath: z.string(),
  entryPoint: z.string().optional(),
  type: z.enum(['api-server', 'worker', 'frontend', 'library', 'unknown']),
  framework: z.string().optional(),
  port: z.number().optional(),
  filesAnalyzed: z.number(),
  layers: z.array(z.enum(['data', 'api', 'service', 'external'])),
})

export type ServiceMetadata = z.infer<typeof ServiceMetadataSchema>

/**
 * Split analysis metadata
 */
export const SplitAnalysisMetadataSchema = z.object({
  analyzedAt: z.string(), // ISO timestamp
  rootPath: z.string(),
  architecture: z.enum(['microservices', 'monolith']),
  services: z.array(ServiceMetadataSchema),
  layers: z.object({
    data: z.object({
      filesAnalyzed: z.number(),
      databases: z.array(z.string()).optional(),
      totalModels: z.number().optional(),
    }).optional(),
    api: z.object({
      filesAnalyzed: z.number(),
      totalEndpoints: z.number().optional(),
      frameworks: z.array(z.string()).optional(),
    }).optional(),
    service: z.object({
      filesAnalyzed: z.number(),
      totalFunctions: z.number().optional(),
      totalClasses: z.number().optional(),
    }).optional(),
    external: z.object({
      filesAnalyzed: z.number(),
      services: z.array(z.string()).optional(),
    }).optional(),
  }),
  totals: z.object({
    filesAnalyzed: z.number(),
    totalFunctions: z.number(),
    totalClasses: z.number(),
    totalCalls: z.number(),
    languages: z.array(z.string()),
  }),
  crossLayerDependencies: z.record(z.number()).optional(), // { "api -> service": 45 }
  violations: z.array(z.object({
    type: z.string(),
    from: z.string(),
    to: z.string(),
    files: z.array(z.object({
      source: z.string(),
      target: z.string(),
      reason: z.string(),
    })),
  })).optional(),
})

export type SplitAnalysisMetadata = z.infer<typeof SplitAnalysisMetadataSchema>
