import type { Tree, SyntaxNode } from 'tree-sitter'
import Parser from 'tree-sitter'
import type {
  ImportStatement,
  ExportStatement,
  SourceLocation,
  SupportedLanguage,
} from '../../types/index.js'
import { getLanguageConfig } from '../language-config.js'
import { getParser } from '../parser.js'

/**
 * Create source location from node
 */
function createSourceLocation(node: SyntaxNode, filePath: string): SourceLocation {
  return {
    filePath,
    startLine: node.startPosition.row + 1,
    endLine: node.endPosition.row + 1,
    startColumn: node.startPosition.column,
    endColumn: node.endPosition.column,
  }
}

/**
 * Extract import source (the module path)
 */
function extractImportSource(node: SyntaxNode): string {
  const sourceNode = node.childForFieldName('source')
  if (!sourceNode) return ''

  // Remove quotes from string literal
  const text = sourceNode.text
  return text.replace(/^['"]|['"]$/g, '')
}

/**
 * Extract named imports from import statement
 */
function extractNamedImports(node: SyntaxNode): Array<{
  name: string
  alias?: string
  isDefault: boolean
  isNamespace: boolean
}> {
  const imports: Array<{
    name: string
    alias?: string
    isDefault: boolean
    isNamespace: boolean
  }> = []

  // Look for import_clause
  for (const child of node.children) {
    if (child.type === 'import_clause') {
      // Default import
      const defaultImport = child.children.find(
        (c) => c.type === 'identifier' && c.parent?.type === 'import_clause'
      )
      if (defaultImport) {
        imports.push({
          name: defaultImport.text,
          isDefault: true,
          isNamespace: false,
        })
      }

      // Named imports
      const namedImports = child.children.find((c) => c.type === 'named_imports')
      if (namedImports) {
        for (const specifier of namedImports.children) {
          if (specifier.type === 'import_specifier') {
            const name = specifier.childForFieldName('name')?.text
            const alias = specifier.childForFieldName('alias')?.text

            if (name) {
              const importItem: {
                name: string
                alias?: string
                isDefault: boolean
                isNamespace: boolean
              } = {
                name,
                isDefault: false,
                isNamespace: false,
              }
              if (alias) {
                importItem.alias = alias
              }
              imports.push(importItem)
            }
          }
        }
      }

      // Namespace import (import * as name)
      const namespaceImport = child.children.find(
        (c) => c.type === 'namespace_import'
      )
      if (namespaceImport) {
        const name = namespaceImport.children.find((c) => c.type === 'identifier')
        if (name) {
          imports.push({
            name: name.text,
            isDefault: false,
            isNamespace: true,
          })
        }
      }
    }
  }

  return imports
}

/**
 * Extract all imports from an AST
 */
export function extractImports(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): ImportStatement[] {
  const config = getLanguageConfig(language)
  const imports: ImportStatement[] = []

  const queryString =
    config.importQuery ||
    config.importNodeTypes.map((type) => `(${type}) @import`).join('\n')

  const parser = getParser(language)
  const tsLanguage = parser.getLanguage()
  const query = new Parser.Query(tsLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    if (node.type !== 'import_statement') {
      continue
    }

    const source = extractImportSource(node)
    const importItems = extractNamedImports(node)
    const location = createSourceLocation(node, filePath)

    if (source && importItems.length > 0) {
      imports.push({
        source,
        imports: importItems,
        location,
      })
    }
  }

  return imports
}

/**
 * Extract export name from export statement
 */
function extractExportName(node: SyntaxNode): string | null {
  // export function name() {}
  const declaration = node.childForFieldName('declaration')
  if (declaration) {
    const name = declaration.childForFieldName('name')
    return name?.text || null
  }

  // export { name }
  const exportClause = node.children.find((c) => c.type === 'export_clause')
  if (exportClause) {
    const specifier = exportClause.children.find((c) => c.type === 'export_specifier')
    if (specifier) {
      const name = specifier.childForFieldName('name')
      return name?.text || null
    }
  }

  return null
}

/**
 * Check if export is default export
 */
function isDefaultExport(node: SyntaxNode): boolean {
  for (const child of node.children) {
    if (child.type === 'default' || child.text === 'default') {
      return true
    }
  }
  return false
}

/**
 * Extract re-export source if applicable
 */
function extractReexportSource(node: SyntaxNode): string | undefined {
  const sourceNode = node.childForFieldName('source')
  if (!sourceNode) return undefined

  const text = sourceNode.text
  return text.replace(/^['"]|['"]$/g, '')
}

/**
 * Extract all exports from an AST
 */
export function extractExports(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): ExportStatement[] {
  const config = getLanguageConfig(language)
  const exports: ExportStatement[] = []

  const queryString =
    config.exportQuery ||
    config.exportNodeTypes.map((type) => `(${type}) @export`).join('\n')

  const parser = getParser(language)
  const tsLanguage = parser.getLanguage()
  const query = new Parser.Query(tsLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    if (node.type !== 'export_statement') {
      continue
    }

    const name = extractExportName(node)
    if (!name) continue

    const isDefault = isDefaultExport(node)
    const source = extractReexportSource(node)
    const location = createSourceLocation(node, filePath)

    exports.push({
      name,
      isDefault,
      source,
      location,
    })
  }

  return exports
}
