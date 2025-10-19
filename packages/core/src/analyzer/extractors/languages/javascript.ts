/**
 * JavaScript extractors
 * JavaScript AST structure is similar to TypeScript but uses a different parser
 */
import type { Tree, SyntaxNode } from 'tree-sitter'
import Parser from 'tree-sitter'
import type {
  FunctionDefinition,
  ClassDefinition,
  ImportStatement,
  ExportStatement,
  Parameter,
  MethodDefinition,
  PropertyDefinition,
} from '../../../types/index.js'
import { getLanguageConfig } from '../../language-config.js'
import { getParser } from '../../parser.js'
import { createSourceLocation, extractDocComment } from './common.js'

/**
 * Extract function name from node
 */
function extractFunctionName(node: SyntaxNode): string {
  const nameNode = node.childForFieldName('name')
  return nameNode?.text || 'anonymous'
}

/**
 * Extract return type from node (JavaScript doesn't have return types)
 */
function extractReturnType(_node: SyntaxNode): string | undefined {
  return undefined // JavaScript doesn't have type annotations
}

/**
 * Check if function is exported
 */
function isExported(node: SyntaxNode): boolean {
  let current: SyntaxNode | null = node.parent

  while (current) {
    if (current.type === 'export_statement') {
      return true
    }
    current = current.parent
  }

  return false
}

/**
 * Check if function is async
 */
function isAsync(node: SyntaxNode): boolean {
  for (const child of node.children) {
    if (child.type === 'async' || child.text === 'async') {
      return true
    }
  }
  return false
}

/**
 * Extract parameters from JavaScript function
 */
function extractParameters(paramsNode: SyntaxNode | null): Parameter[] {
  if (!paramsNode) return []

  const parameters: Parameter[] = []

  for (const child of paramsNode.namedChildren) {
    if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
      const pattern = child.childForFieldName('pattern')
      const value = child.childForFieldName('value')

      const name = pattern?.text || 'unknown'
      const optional = child.type === 'optional_parameter'
      const defaultValue = value?.text

      parameters.push({
        name,
        type: undefined, // JavaScript doesn't have type annotations
        optional,
        defaultValue,
      })
    }
  }

  return parameters
}

/**
 * Extract JavaScript functions
 */
export function extractJavaScriptFunctions(
  tree: Tree,
  filePath: string
): FunctionDefinition[] {
  const config = getLanguageConfig('javascript')
  const functions: FunctionDefinition[] = []

  const queryString =
    config.functionQuery ||
    config.functionNodeTypes.map((type) => `(${type}) @function`).join('\n')

  const parser = getParser('javascript')
  const jsLanguage = parser.getLanguage()
  const query = new Parser.Query(jsLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    if (!config.functionNodeTypes.includes(node.type)) {
      continue
    }

    const name = extractFunctionName(node)
    const paramsNode = node.childForFieldName('parameters')
    const parameters = extractParameters(paramsNode)
    const returnType = extractReturnType(node)
    const location = createSourceLocation(node, filePath)
    const exported = isExported(node)
    const async = isAsync(node)
    const docComment = extractDocComment(node)

    functions.push({
      name,
      qualifiedName: name,
      parameters,
      returnType,
      isExported: exported,
      isAsync: async,
      location,
      docComment,
    })
  }

  return functions
}

/**
 * Extract class name from node
 */
function extractClassName(node: SyntaxNode): string {
  const nameNode = node.childForFieldName('name')
  return nameNode?.text || 'Anonymous'
}

/**
 * Extract heritage (extends) from class
 */
function extractHeritage(node: SyntaxNode): {
  extendsFrom: string[]
} {
  const extendsFrom: string[] = []

  const heritageNode = node.childForFieldName('heritage')
  if (!heritageNode) {
    return { extendsFrom }
  }

  for (const child of heritageNode.children) {
    if (child.type === 'extends_clause') {
      const value = child.childForFieldName('value')
      if (value) {
        extendsFrom.push(value.text)
      }
    }
  }

  return { extendsFrom }
}

/**
 * Check if node has a specific modifier
 */
function hasModifier(node: SyntaxNode, modifier: string): boolean {
  for (const child of node.children) {
    if (child.text === modifier) {
      return true
    }
  }
  return false
}

/**
 * Extract methods from class body
 */
function extractMethods(
  bodyNode: SyntaxNode,
  className: string,
  filePath: string
): MethodDefinition[] {
  const methods: MethodDefinition[] = []

  for (const member of bodyNode.namedChildren) {
    if (member.type === 'method_definition') {
      const name = member.childForFieldName('name')?.text || 'unknown'
      const paramsNode = member.childForFieldName('parameters')
      const parameters = extractParameters(paramsNode)
      const returnType = extractReturnType(member)
      const location = createSourceLocation(member, filePath)

      const isStatic = hasModifier(member, 'static')
      const async = isAsync(member)
      const isExported = false

      methods.push({
        name,
        qualifiedName: `${className}.${name}`,
        parameters,
        returnType,
        isExported,
        isAsync: async,
        location,
        visibility: 'public', // JavaScript doesn't have access modifiers
        isStatic,
        isAbstract: false,
      })
    }
  }

  return methods
}

/**
 * Extract properties from class body
 */
function extractProperties(
  bodyNode: SyntaxNode,
  filePath: string
): PropertyDefinition[] {
  const properties: PropertyDefinition[] = []

  for (const member of bodyNode.namedChildren) {
    if (member.type === 'public_field_definition' || member.type === 'field_definition') {
      const name = member.childForFieldName('property')?.text || 'unknown'
      const location = createSourceLocation(member, filePath)
      const isStatic = hasModifier(member, 'static')

      properties.push({
        name,
        type: undefined, // JavaScript doesn't have type annotations
        visibility: 'public',
        isStatic,
        isReadonly: false,
        location,
      })
    }
  }

  return properties
}

/**
 * Extract JavaScript classes
 */
export function extractJavaScriptClasses(
  tree: Tree,
  filePath: string
): ClassDefinition[] {
  const config = getLanguageConfig('javascript')
  const classes: ClassDefinition[] = []

  const queryString =
    config.classQuery ||
    config.classNodeTypes.map((type) => `(${type}) @class`).join('\n')

  const parser = getParser('javascript')
  const jsLanguage = parser.getLanguage()
  const query = new Parser.Query(jsLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    if (!config.classNodeTypes.includes(node.type)) {
      continue
    }

    const name = extractClassName(node)
    const location = createSourceLocation(node, filePath)
    const exported = isExported(node)
    const docComment = extractDocComment(node)

    const heritage = extractHeritage(node)

    const bodyNode = node.childForFieldName('body')
    const methods = bodyNode ? extractMethods(bodyNode, name, filePath) : []
    const properties = bodyNode ? extractProperties(bodyNode, filePath) : []

    classes.push({
      name,
      qualifiedName: name,
      kind: 'class',
      isExported: exported,
      isAbstract: false,
      extendsFrom: heritage.extendsFrom,
      implements: [], // JavaScript doesn't have implements
      methods,
      properties,
      location,
      docComment,
    })
  }

  return classes
}

/**
 * Extract import source
 */
function extractImportSource(node: SyntaxNode): string {
  const sourceNode = node.childForFieldName('source')
  if (!sourceNode) return ''

  const text = sourceNode.text
  return text.replace(/^['"]|['"]$/g, '')
}

/**
 * Extract named imports
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

  for (const child of node.children) {
    if (child.type === 'import_clause') {
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
 * Extract JavaScript imports
 */
export function extractJavaScriptImports(
  tree: Tree,
  filePath: string
): ImportStatement[] {
  const config = getLanguageConfig('javascript')
  const imports: ImportStatement[] = []

  const queryString =
    config.importQuery ||
    config.importNodeTypes.map((type) => `(${type}) @import`).join('\n')

  const parser = getParser('javascript')
  const jsLanguage = parser.getLanguage()
  const query = new Parser.Query(jsLanguage, queryString)

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
 * Extract export name
 */
function extractExportName(node: SyntaxNode): string | null {
  const declaration = node.childForFieldName('declaration')
  if (declaration) {
    const name = declaration.childForFieldName('name')
    return name?.text || null
  }

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
 * Check if export is default
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
 * Extract re-export source
 */
function extractReexportSource(node: SyntaxNode): string | undefined {
  const sourceNode = node.childForFieldName('source')
  if (!sourceNode) return undefined

  const text = sourceNode.text
  return text.replace(/^['"]|['"]$/g, '')
}

/**
 * Extract JavaScript exports
 */
export function extractJavaScriptExports(
  tree: Tree,
  filePath: string
): ExportStatement[] {
  const config = getLanguageConfig('javascript')
  const exports: ExportStatement[] = []

  const queryString =
    config.exportQuery ||
    config.exportNodeTypes.map((type) => `(${type}) @export`).join('\n')

  const parser = getParser('javascript')
  const jsLanguage = parser.getLanguage()
  const query = new Parser.Query(jsLanguage, queryString)

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

