import type { SupportedLanguage } from '../types/index.js'

/**
 * Language-specific configuration for tree-sitter parsing
 */
export interface LanguageConfig {
  name: SupportedLanguage
  fileExtensions: string[]

  // AST node types for different language constructs
  functionNodeTypes: string[]
  classNodeTypes: string[]
  importNodeTypes: string[]
  exportNodeTypes: string[]
  callNodeTypes: string[]

  // Optional: Custom tree-sitter query strings
  functionQuery?: string
  classQuery?: string
  importQuery?: string
  exportQuery?: string
}

/**
 * TypeScript language configuration
 */
export const TYPESCRIPT_CONFIG: LanguageConfig = {
  name: 'typescript',
  fileExtensions: ['.ts', '.tsx'],

  functionNodeTypes: [
    'function_declaration',
    'arrow_function',
    'function_expression',
    'method_definition',
    'function_signature', // For ambient declarations
  ],

  classNodeTypes: [
    'class_declaration',
    'abstract_class_declaration',
    'interface_declaration',
    'type_alias_declaration',
    'enum_declaration',
  ],

  importNodeTypes: ['import_statement', 'import_clause'],

  exportNodeTypes: ['export_statement'],

  callNodeTypes: ['call_expression'],

  // Simplified queries - just capture node types
  functionQuery: `
    (function_declaration) @function
    (method_definition) @function
    (arrow_function) @function
  `,

  classQuery: `
    (class_declaration) @class
    (abstract_class_declaration) @class
    (interface_declaration) @class
    (type_alias_declaration) @class
    (enum_declaration) @class
  `,

  importQuery: `
    (import_statement) @import
  `,

  exportQuery: `
    (export_statement) @export
  `,
}

/**
 * JavaScript language configuration
 * Reuses TypeScript queries (they work for JS too)
 */
export const JAVASCRIPT_CONFIG: LanguageConfig = {
  ...TYPESCRIPT_CONFIG,
  name: 'javascript',
  fileExtensions: ['.js', '.jsx'],

  functionNodeTypes: [
    'function_declaration',
    'arrow_function',
    'function_expression',
    'method_definition',
    'generator_function_declaration',
  ],

  classNodeTypes: ['class_declaration', 'class'],

  // Simplified queries for JavaScript
  functionQuery: `
    (function_declaration) @function
    (method_definition) @function
    (arrow_function) @function
  `,

  classQuery: `
    (class_declaration) @class
  `,
}

/**
 * Python language configuration
 */
export const PYTHON_CONFIG: LanguageConfig = {
  name: 'python',
  fileExtensions: ['.py', '.pyi'],

  functionNodeTypes: ['function_definition'],

  classNodeTypes: ['class_definition'],

  importNodeTypes: ['import_statement', 'import_from_statement'],

  exportNodeTypes: [], // Python doesn't have explicit export statements

  callNodeTypes: ['call'],

  functionQuery: `
    (function_definition) @function
  `,

  classQuery: `
    (class_definition) @class
  `,

  importQuery: `
    (import_statement) @import
    (import_from_statement) @import
  `,

  exportQuery: '',
}

/**
 * Get language configuration by language name
 */
export function getLanguageConfig(language: SupportedLanguage): LanguageConfig {
  switch (language) {
    case 'typescript':
      return TYPESCRIPT_CONFIG
    case 'javascript':
      return JAVASCRIPT_CONFIG
    case 'python':
      return PYTHON_CONFIG
    default:
      throw new Error(`Unsupported language: ${language}`)
  }
}

/**
 * Detect language from file extension
 */
export function detectLanguage(filePath: string): SupportedLanguage | null {
  const ext = filePath.substring(filePath.lastIndexOf('.'))

  if (TYPESCRIPT_CONFIG.fileExtensions.includes(ext)) {
    return 'typescript'
  }

  if (JAVASCRIPT_CONFIG.fileExtensions.includes(ext)) {
    return 'javascript'
  }

  if (PYTHON_CONFIG.fileExtensions.includes(ext)) {
    return 'python'
  }

  return null
}
