import type { Tree } from 'tree-sitter'
import type { FunctionDefinition, SupportedLanguage } from '../../types/index.js'
import { extractTypeScriptFunctions } from './languages/typescript.js'
import { extractJavaScriptFunctions } from './languages/javascript.js'
import { extractPythonFunctions } from './languages/python.js'

/**
 * Extract all functions from an AST
 * Routes to language-specific extractors
 */
export function extractFunctions(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): FunctionDefinition[] {
  switch (language) {
    case 'typescript':
      return extractTypeScriptFunctions(tree, filePath)
    case 'javascript':
      return extractJavaScriptFunctions(tree, filePath)
    case 'python':
      return extractPythonFunctions(tree, filePath)
    default:
      throw new Error(`Unsupported language: ${language}`)
  }
}
