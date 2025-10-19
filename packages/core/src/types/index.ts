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
