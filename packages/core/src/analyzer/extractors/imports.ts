import type { Tree } from 'tree-sitter'
import type { ImportStatement, ExportStatement, SupportedLanguage } from '../../types/index.js'
import {
  extractTypeScriptImports,
  extractTypeScriptExports,
} from './languages/typescript.js'
import {
  extractJavaScriptImports,
  extractJavaScriptExports,
} from './languages/javascript.js'
import { extractPythonImports } from './languages/python.js'

/**
 * Extract all imports from an AST
 * Routes to language-specific extractors
 */
export function extractImports(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): ImportStatement[] {
  switch (language) {
    case 'typescript':
      return extractTypeScriptImports(tree, filePath)
    case 'javascript':
      return extractJavaScriptImports(tree, filePath)
    case 'python':
      return extractPythonImports(tree, filePath)
    default:
      throw new Error(`Unsupported language: ${language}`)
  }
}

/**
 * Extract all exports from an AST
 * Routes to language-specific extractors
 */
export function extractExports(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): ExportStatement[] {
  switch (language) {
    case 'typescript':
      return extractTypeScriptExports(tree, filePath)
    case 'javascript':
      return extractJavaScriptExports(tree, filePath)
    case 'python':
      return [] // Python doesn't have explicit exports
    default:
      throw new Error(`Unsupported language: ${language}`)
  }
}
