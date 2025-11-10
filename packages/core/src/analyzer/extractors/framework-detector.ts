import type { SupportedLanguage } from '../../types/index.js'
import { loadPatterns } from '../pattern-loader.js'

/**
 * Detect ORM framework from source code based on imports/using statements
 */
export function detectFrameworkFromSource(
  sourceCode: string,
  language: SupportedLanguage
): string | undefined {
  const patterns = loadPatterns()
  const orms = patterns.data.orms[language as keyof typeof patterns.data.orms]

  if (!orms) return undefined

  // For each ORM in the config, check if it appears in the source code
  for (const orm of orms) {
    if (sourceMatchesOrm(sourceCode, orm, language)) {
      return orm
    }
  }

  return undefined
}

/**
 * Check if source code matches a specific ORM pattern
 */
function sourceMatchesOrm(
  sourceCode: string,
  orm: string,
  language: SupportedLanguage
): boolean {
  switch (language) {
    case 'typescript':
    case 'javascript':
      // Check for: import ... from 'orm-name'
      // or: import('orm-name')
      // or: require('orm-name')
      const jsPatterns = [
        `from '${orm}'`,
        `from "${orm}"`,
        `require('${orm}')`,
        `require("${orm}")`,
        `import('${orm}')`,
        `import("${orm}")`,
      ]
      return jsPatterns.some(pattern => sourceCode.includes(pattern))

    case 'python':
      // Check for: import orm_name
      // or: from orm_name import ...
      const pyPatterns = [
        `import ${orm}`,
        `from ${orm} import`,
        `from ${orm}.`,
      ]
      return pyPatterns.some(pattern => sourceCode.includes(pattern))

    case 'csharp':
      // Check for: using OrmNamespace;
      const csPatterns = [
        `using ${orm};`,
        `using ${orm}.`,
      ]
      return csPatterns.some(pattern => sourceCode.includes(pattern))

    default:
      return false
  }
}

/**
 * Detect framework from imports list (already extracted)
 */
export function detectFrameworkFromImports(
  imports: string[],
  language: SupportedLanguage
): string | undefined {
  const patterns = loadPatterns()
  const orms = patterns.data.orms[language as keyof typeof patterns.data.orms]

  if (!orms) return undefined

  // Check if any import matches any ORM
  for (const orm of orms) {
    for (const imp of imports) {
      if (importMatchesOrm(imp, orm, language)) {
        return orm
      }
    }
  }

  return undefined
}

/**
 * Check if an import statement matches an ORM
 */
function importMatchesOrm(
  importPath: string,
  orm: string,
  language: SupportedLanguage
): boolean {
  switch (language) {
    case 'typescript':
    case 'javascript':
      // Exact match or scoped package match
      // e.g., "typeorm" matches "typeorm"
      // e.g., "@prisma/client" matches "@prisma/client"
      return importPath === orm || importPath.startsWith(orm + '/')

    case 'python':
      // Exact match or submodule match
      // e.g., "sqlalchemy" matches "sqlalchemy"
      // e.g., "sqlalchemy.orm" matches "sqlalchemy"
      return importPath === orm || importPath.startsWith(orm + '.')

    case 'csharp':
      // Namespace match
      // e.g., "Microsoft.EntityFrameworkCore" matches "Microsoft.EntityFrameworkCore"
      // e.g., "Microsoft.EntityFrameworkCore.SqlServer" matches "Microsoft.EntityFrameworkCore"
      return importPath === orm || importPath.startsWith(orm + '.')

    default:
      return false
  }
}

/**
 * Get a user-friendly display name for an ORM package
 * This converts package names to human-readable names
 */
export function getOrmDisplayName(ormPackage: string): string {
  const patterns = loadPatterns()
  return patterns.data.ormDisplayNames?.[ormPackage] || ormPackage
}

/**
 * Get ORM detection patterns for a language
 */
export function getOrmDetectionPatterns(language: 'python' | 'typescript' | 'csharp'): any {
  const patterns = loadPatterns()
  return patterns.data.ormDetectionPatterns?.[language] || {}
}

/**
 * Get ORM field patterns from config for a specific framework
 */
export function getOrmFieldPatterns(framework: string | undefined): any {
  if (!framework) return null

  const patterns = loadPatterns()
  return patterns.data.ormFieldPatterns?.[framework] || null
}

/**
 * Detect field type from text using ORM patterns
 */
export function detectFieldType(fieldText: string, patterns: any): string {
  if (!patterns?.typeMapping) return 'string'

  for (const [type, keywords] of Object.entries(patterns.typeMapping)) {
    const keywordArray = keywords as string[]
    if (keywordArray.some(keyword => fieldText.includes(keyword))) {
      return type
    }
  }

  return 'string'
}

/**
 * Check if text matches a property pattern
 */
export function matchesPropertyPattern(text: string, patterns: any, property: string): boolean {
  if (!patterns?.propertyPatterns?.[property]) return false

  const propertyPatterns = patterns.propertyPatterns[property] as string[]
  return propertyPatterns.some(pattern => text.includes(pattern))
}

/**
 * Check if field should be skipped (e.g., relationships)
 */
export function shouldSkipField(fieldText: string, patterns: any): boolean {
  if (!patterns?.skipPatterns) return false

  const skipPatterns = patterns.skipPatterns as string[]
  return skipPatterns.some(pattern => fieldText.includes(pattern))
}

/**
 * Detect relationship type from field text using ORM patterns
 */
export function detectRelationshipType(fieldText: string, patterns: any): { type: string; pattern: string } | null {
  if (!patterns?.relationshipPatterns) return null

  for (const [relType, relPatterns] of Object.entries(patterns.relationshipPatterns)) {
    const patternArray = relPatterns as string[]
    const matchedPattern = patternArray.find(pattern => fieldText.includes(pattern))
    if (matchedPattern) {
      return { type: relType, pattern: matchedPattern }
    }
  }

  return null
}
