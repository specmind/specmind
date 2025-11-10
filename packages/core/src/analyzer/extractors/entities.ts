/**
 * Entity extraction for data layer files
 * Detects ORM entities/models and extracts schema information
 */

import type { FileAnalysis } from '../../types/index.js'
import type { Entity } from '../../types/entity.js'
import { TypeScriptEntityDetector } from './languages/typescript-entities.js'
import { PythonEntityDetector } from './languages/python-entities.js'
import { CSharpEntityDetector } from './languages/csharp-entities.js'
import { loadPatterns, matchesPattern } from '../pattern-loader.js'

/**
 * Check if a file likely contains entities based on ORM import patterns
 */
export function shouldExtractEntities(analysis: FileAnalysis): boolean {
  const patterns = loadPatterns()

  // Check for ORM imports
  const allOrms = [
    ...patterns.data.orms.typescript,
    ...patterns.data.orms.python,
    ...patterns.data.orms.csharp,
  ]

  for (const imp of analysis.imports) {
    if (allOrms.some(orm => matchesPattern(imp.source, orm))) {
      return true
    }
  }

  // Check file naming patterns (case-insensitive for directory names, case-sensitive for file extensions)
  const filePath = analysis.filePath.toLowerCase()
  const entityFilePatterns = [
    'models',
    'entities',
    'schemas',
    'data', // For C# projects
    'domain',
    'database',
    'model.',
    'entity.',
    'schema.',
  ]

  return entityFilePatterns.some(pattern => filePath.includes(pattern))
}

/**
 * Extract entities from a file's source code
 */
export async function extractEntities(
  sourceCode: string,
  filePath: string,
  language: 'typescript' | 'javascript' | 'python' | 'csharp',
  serviceName: string = 'default'
): Promise<Entity[]> {
  const detectors = {
    typescript: new TypeScriptEntityDetector(),
    javascript: new TypeScriptEntityDetector(), // JS uses same detector as TS
    python: new PythonEntityDetector(),
    csharp: new CSharpEntityDetector(),
  }

  const detector = detectors[language]
  if (!detector) return []

  // Check if we should scan this file
  if (!detector.shouldScanFile(filePath)) {
    return []
  }

  return detector.detectEntities(sourceCode, filePath, serviceName)
}
