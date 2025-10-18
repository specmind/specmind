import type {
  FileAnalysis,
  ClassDefinition,
  FunctionDefinition,
  MethodDefinition,
} from '../types/index.js'

/**
 * Options for diagram generation
 */
export interface DiagramOptions {
  /** Include private members in class diagrams */
  includePrivate?: boolean
  /** Include method parameters in class diagrams */
  includeParameters?: boolean
  /** Maximum depth for relationship traversal */
  maxDepth?: number
}

/**
 * Generate a Mermaid class diagram from file analysis
 */
export function generateClassDiagram(
  analysis: FileAnalysis,
  options: DiagramOptions = {}
): string {
  const { includePrivate = false, includeParameters = true } = options

  const lines: string[] = ['classDiagram']

  // Generate class definitions
  for (const classDef of analysis.classes) {
    if (classDef.kind === 'class' || classDef.kind === 'interface') {
      lines.push(...generateClassDefinition(classDef, includePrivate, includeParameters))
    } else if (classDef.kind === 'enum') {
      lines.push(...generateEnumDefinition(classDef))
    } else if (classDef.kind === 'type') {
      // Type aliases are shown as simple classes
      lines.push(`  class ${classDef.name}`)
      lines.push(`    <<type>>`)
    }
  }

  // Generate relationships
  for (const classDef of analysis.classes) {
    if (classDef.kind === 'class') {
      // Inheritance (extends)
      for (const parent of classDef.extendsFrom || []) {
        lines.push(`  ${parent} <|-- ${classDef.name}`)
      }

      // Interface implementation
      for (const iface of classDef.implements || []) {
        lines.push(`  ${iface} <|.. ${classDef.name}`)
      }
    } else if (classDef.kind === 'interface') {
      // Interface inheritance
      for (const parent of classDef.extendsFrom || []) {
        lines.push(`  ${parent} <|-- ${classDef.name}`)
      }
    }
  }

  return lines.join('\n')
}

/**
 * Generate class definition with methods and properties
 */
function generateClassDefinition(
  classDef: ClassDefinition,
  includePrivate: boolean,
  includeParameters: boolean
): string[] {
  const lines: string[] = []

  // Class header
  if (classDef.kind === 'interface') {
    lines.push(`  class ${classDef.name}`)
    lines.push(`    <<interface>>`)
  } else if (classDef.isAbstract) {
    lines.push(`  class ${classDef.name}`)
    lines.push(`    <<abstract>>`)
  } else {
    lines.push(`  class ${classDef.name} {`)
  }

  // Properties
  const properties = classDef.properties || []
  for (const prop of properties) {
    if (!includePrivate && prop.visibility === 'private') continue

    const visibilitySymbol = getVisibilitySymbol(prop.visibility)
    const staticModifier = prop.isStatic ? '$ ' : ''
    const type = prop.type ? ` ${prop.type}` : ''

    if (classDef.kind === 'interface') {
      lines.push(`    ${staticModifier}${prop.name}${type}`)
    } else {
      lines.push(`    ${visibilitySymbol}${staticModifier}${prop.name}${type}`)
    }
  }

  // Methods
  const methods = classDef.methods || []
  for (const method of methods) {
    if (!includePrivate && method.visibility === 'private') continue

    const visibilitySymbol = getVisibilitySymbol(method.visibility)
    const staticModifier = method.isStatic ? '$ ' : ''
    const params = includeParameters ? formatParameters(method) : ''
    const returnType = method.returnType ? ` ${method.returnType}` : ''

    if (classDef.kind === 'interface') {
      lines.push(`    ${staticModifier}${method.name}(${params})${returnType}`)
    } else {
      lines.push(`    ${visibilitySymbol}${staticModifier}${method.name}(${params})${returnType}`)
    }
  }

  // Close class definition
  if (classDef.kind !== 'interface') {
    lines.push(`  }`)
  }

  return lines
}

/**
 * Generate enum definition
 */
function generateEnumDefinition(enumDef: ClassDefinition): string[] {
  const lines: string[] = []

  lines.push(`  class ${enumDef.name} {`)
  lines.push(`    <<enumeration>>`)

  // Enums don't have detailed member info in our current analysis,
  // so just mark it as an enum
  lines.push(`  }`)

  return lines
}

/**
 * Get Mermaid visibility symbol
 */
function getVisibilitySymbol(visibility: 'public' | 'private' | 'protected'): string {
  switch (visibility) {
    case 'public':
      return '+'
    case 'private':
      return '-'
    case 'protected':
      return '#'
  }
}

/**
 * Format method parameters for display
 */
function formatParameters(method: MethodDefinition | FunctionDefinition): string {
  if (!method.parameters || method.parameters.length === 0) {
    return ''
  }

  return method.parameters
    .map((param) => {
      const name = param.name
      const type = param.type ? ` ${param.type}` : ''
      return `${name}${type}`
    })
    .join(', ')
}

/**
 * Generate a Mermaid component diagram from multiple file analyses
 */
export function generateComponentDiagram(
  analyses: FileAnalysis[],
  _options: DiagramOptions = {}
): string {
  const lines: string[] = ['graph TD']

  // Create a map of file paths to sanitized node IDs
  const fileNodeMap = new Map<string, string>()
  analyses.forEach((analysis, index) => {
    const fileName = getFileName(analysis.filePath)
    const nodeId = `file${index}`
    fileNodeMap.set(analysis.filePath, nodeId)
    lines.push(`  ${nodeId}[${fileName}]`)
  })

  // Generate dependencies
  for (const analysis of analyses) {
    const sourceNodeId = fileNodeMap.get(analysis.filePath)
    if (!sourceNodeId) continue

    for (const importStmt of analysis.imports) {
      // Try to find the target file in our analyses
      const targetAnalysis = findAnalysisByImport(analyses, importStmt.source)
      if (targetAnalysis) {
        const targetNodeId = fileNodeMap.get(targetAnalysis.filePath)
        if (targetNodeId) {
          lines.push(`  ${sourceNodeId} --> ${targetNodeId}`)
        }
      }
    }
  }

  return lines.join('\n')
}

/**
 * Extract file name from path
 */
function getFileName(filePath: string): string {
  const parts = filePath.split('/')
  return parts[parts.length - 1] || filePath
}

/**
 * Find file analysis by import source path
 */
function findAnalysisByImport(
  analyses: FileAnalysis[],
  importSource: string
): FileAnalysis | undefined {
  // Remove leading ./ or ../
  const normalizedImport = importSource.replace(/^\.\//, '').replace(/^\.\.\//, '')

  return analyses.find((analysis) => {
    const fileName = getFileName(analysis.filePath)
    const fileNameWithoutExt = fileName.replace(/\.(ts|tsx|js|jsx)$/, '')

    // Check if import matches file name
    return (
      normalizedImport === fileName ||
      normalizedImport === fileNameWithoutExt ||
      normalizedImport.endsWith(`/${fileName}`) ||
      normalizedImport.endsWith(`/${fileNameWithoutExt}`)
    )
  })
}

/**
 * Generate a Mermaid sequence diagram for function calls
 * (Basic implementation - can be enhanced to trace actual calls)
 */
export function generateSequenceDiagram(analysis: FileAnalysis): string {
  const lines: string[] = ['sequenceDiagram']

  // For now, just show exported functions as potential entry points
  const exportedFunctions = analysis.functions.filter((f) => f.isExported)

  if (exportedFunctions.length > 0) {
    lines.push(`  participant Client`)

    for (const func of exportedFunctions) {
      const asyncIndicator = func.isAsync ? ' (async)' : ''
      lines.push(`  Client->>+${analysis.filePath}: ${func.name}()${asyncIndicator}`)

      // If it's async, show the response
      if (func.isAsync) {
        const returnType = func.returnType || 'result'
        lines.push(`  ${analysis.filePath}-->>-Client: ${returnType}`)
      }
    }
  } else {
    lines.push(`  Note over Client: No exported functions found`)
  }

  return lines.join('\n')
}
