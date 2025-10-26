import { readFile } from 'fs/promises'
import type { FileAnalysis, SupportedLanguage, ExportStatement } from '../types/index.js'
import { detectLanguage } from './language-config.js'
import { parseFile } from './parser.js'
import { extractCalls, buildFunctionContext } from './extractors/calls.js'
import { extractHttpCalls } from './extractors/http-calls.js'
import {
  extractTypeScriptFunctions,
  extractTypeScriptClasses,
  extractTypeScriptImports,
  extractTypeScriptExports,
} from './extractors/languages/typescript.js'
import {
  extractJavaScriptFunctions,
  extractJavaScriptClasses,
  extractJavaScriptImports,
  extractJavaScriptExports,
} from './extractors/languages/javascript.js'
import {
  extractPythonFunctions,
  extractPythonClasses,
  extractPythonImports,
} from './extractors/languages/python.js'

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

    // Extract all elements using language-specific extractors
    let functions, classes, imports, exports: ExportStatement[]

    switch (language) {
      case 'typescript':
        functions = extractTypeScriptFunctions(tree, filePath)
        classes = extractTypeScriptClasses(tree, filePath)
        imports = extractTypeScriptImports(tree, filePath)
        exports = extractTypeScriptExports(tree, filePath)
        break
      case 'javascript':
        functions = extractJavaScriptFunctions(tree, filePath)
        classes = extractJavaScriptClasses(tree, filePath)
        imports = extractJavaScriptImports(tree, filePath)
        exports = extractJavaScriptExports(tree, filePath)
        break
      case 'python':
        functions = extractPythonFunctions(tree, filePath)
        classes = extractPythonClasses(tree, filePath)
        imports = extractPythonImports(tree, filePath)
        exports = [] // Python doesn't have explicit exports
        break
      default:
        throw new Error(`Unsupported language: ${language}`)
    }

    // Build function context and extract calls
    const functionContext = buildFunctionContext(functions, classes)
    const calls = extractCalls(tree, filePath, language, functionContext)
    const httpCalls = extractHttpCalls(tree, filePath, language, functions, classes)

    return {
      filePath,
      language,
      functions,
      classes,
      imports,
      exports,
      calls,
      httpCalls,
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

  // Extract all elements using language-specific extractors
  let functions, classes, imports, exports: ExportStatement[]

  switch (language) {
    case 'typescript':
      functions = extractTypeScriptFunctions(tree, filePath)
      classes = extractTypeScriptClasses(tree, filePath)
      imports = extractTypeScriptImports(tree, filePath)
      exports = extractTypeScriptExports(tree, filePath)
      break
    case 'javascript':
      functions = extractJavaScriptFunctions(tree, filePath)
      classes = extractJavaScriptClasses(tree, filePath)
      imports = extractJavaScriptImports(tree, filePath)
      exports = extractJavaScriptExports(tree, filePath)
      break
    case 'python':
      functions = extractPythonFunctions(tree, filePath)
      classes = extractPythonClasses(tree, filePath)
      imports = extractPythonImports(tree, filePath)
      exports = [] // Python doesn't have explicit exports
      break
    default:
      throw new Error(`Unsupported language: ${language}`)
  }

  // Build function context and extract calls
  const functionContext = buildFunctionContext(functions, classes)
  const calls = extractCalls(tree, filePath, language, functionContext)
  const httpCalls = extractHttpCalls(tree, filePath, language, functions, classes)

  return {
    filePath,
    language,
    functions,
    classes,
    imports,
    exports,
    calls,
    httpCalls,
  }
}
