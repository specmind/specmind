import { readFile } from 'fs/promises'
import type { FileAnalysis, SupportedLanguage } from '../types/index.js'
import { detectLanguage } from './language-config.js'
import { parseFile } from './parser.js'
import { extractFunctions } from './extractors/functions.js'
import { extractClasses } from './extractors/classes.js'
import { extractImports, extractExports } from './extractors/imports.js'

/**
 * Analyze a single file and extract all code elements
 */
export async function analyzeFile(filePath: string): Promise<FileAnalysis | null> {
  // Detect language from file extension
  const language = detectLanguage(filePath)
  if (!language) {
    return null
  }

  try {
    // Read file content
    const content = await readFile(filePath, 'utf-8')

    // Parse the file
    const tree = parseFile(filePath, content, language)

    // Extract all elements
    const functions = extractFunctions(tree, filePath, language)
    const classes = extractClasses(tree, filePath, language)
    const imports = extractImports(tree, filePath, language)
    const exports = extractExports(tree, filePath, language)

    return {
      filePath,
      language,
      functions,
      classes,
      imports,
      exports,
    }
  } catch (error) {
    throw new Error(
      `Failed to analyze file ${filePath}: ${
        error instanceof Error ? error.message : String(error)
      }`
    )
  }
}

/**
 * Analyze file from in-memory content (useful for testing)
 */
export function analyzeFileContent(
  filePath: string,
  content: string,
  language: SupportedLanguage
): FileAnalysis {
  // Parse the content
  const tree = parseFile(filePath, content, language)

  // Extract all elements
  const functions = extractFunctions(tree, filePath, language)
  const classes = extractClasses(tree, filePath, language)
  const imports = extractImports(tree, filePath, language)
  const exports = extractExports(tree, filePath, language)

  return {
    filePath,
    language,
    functions,
    classes,
    imports,
    exports,
  }
}
