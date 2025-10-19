import type { Tree } from 'tree-sitter'
import type { ClassDefinition, SupportedLanguage } from '../../types/index.js'
import { extractTypeScriptClasses } from './languages/typescript.js'
import { extractJavaScriptClasses } from './languages/javascript.js'
import { extractPythonClasses } from './languages/python.js'

/**
 * Extract all classes from an AST
 * Routes to language-specific extractors
 */
export function extractClasses(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): ClassDefinition[] {
  switch (language) {
    case 'typescript':
      return extractTypeScriptClasses(tree, filePath)
    case 'javascript':
      return extractJavaScriptClasses(tree, filePath)
    case 'python':
      return extractPythonClasses(tree, filePath)
    default:
      throw new Error(`Unsupported language: ${language}`)
  }
}
