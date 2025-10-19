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
 * Extract return type from node
 */
function extractReturnType(node: SyntaxNode): string | undefined {
  const returnTypeNode = node.childForFieldName('return_type')
  if (!returnTypeNode) return undefined

  return returnTypeNode.text.replace(/^:\s*/, '')
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
  // Look for 'async' keyword in function declaration
  for (const child of node.children) {
    if (child.type === 'async' || child.text === 'async') {
      return true
    }
  }
  return false
}

/**
 * Extract parameters from TypeScript/JavaScript function
 */
function extractParameters(paramsNode: SyntaxNode | null): Parameter[] {
  if (!paramsNode) return []

  const parameters: Parameter[] = []

  for (const child of paramsNode.namedChildren) {
    if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
      const pattern = child.childForFieldName('pattern')
      const typeAnnotation = child.childForFieldName('type')
      const value = child.childForFieldName('value')

      const name = pattern?.text || 'unknown'
      const type = typeAnnotation?.text?.replace(/^:\s*/, '')
      const optional = child.type === 'optional_parameter'
      const defaultValue = value?.text

      parameters.push({
        name,
        type,
        optional,
        defaultValue,
      })
    }
  }

  return parameters
}

/**
 * Extract class name from node
 */
function extractClassName(node: SyntaxNode): string {
  const nameNode = node.childForFieldName('name')
  return nameNode?.text || 'Anonymous'
}

/**
 * Extract heritage (extends/implements) from class
 */
function extractHeritage(node: SyntaxNode): {
  extendsFrom: string[]
  implementsInterfaces: string[]
} {
  const extendsFrom: string[] = []
  const implementsInterfaces: string[] = []

  // Look for class_heritage or extends_clause
  const heritageNode = node.childForFieldName('heritage')
  if (!heritageNode) {
    return { extendsFrom, implementsInterfaces }
  }

  for (const child of heritageNode.children) {
    if (child.type === 'extends_clause') {
      const value = child.childForFieldName('value')
      if (value) {
        extendsFrom.push(value.text)
      }
    } else if (child.type === 'implements_clause') {
      for (const implementsNode of child.namedChildren) {
        implementsInterfaces.push(implementsNode.text)
      }
    }
  }

  return { extendsFrom, implementsInterfaces }
}

/**
 * Extract interface extends
 */
function extractInterfaceExtends(node: SyntaxNode): string[] {
  const extendsClause = node.children.find(
    (child) => child.type === 'extends_type_clause'
  )
  if (!extendsClause) return []

  return extendsClause.namedChildren.map((child) => child.text)
}

/**
 * Extract visibility modifier (public/private/protected)
 */
function extractVisibility(
  node: SyntaxNode
): 'public' | 'private' | 'protected' {
  for (const child of node.children) {
    if (child.type === 'accessibility_modifier') {
      const text = child.text
      if (text === 'private') return 'private'
      if (text === 'protected') return 'protected'
      return 'public'
    }
  }
  return 'public'
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

      // Check for modifiers
      const visibility = extractVisibility(member)
      const isStatic = hasModifier(member, 'static')
      const isAbstract = hasModifier(member, 'abstract')
      const async = isAsync(member)
      const isExported = false // Methods aren't directly exported

      methods.push({
        name,
        qualifiedName: `${className}.${name}`,
        parameters,
        returnType,
        isExported,
        isAsync: async,
        location,
        visibility,
        isStatic,
        isAbstract,
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
      const typeAnnotation = member.childForFieldName('type')
      const type = typeAnnotation?.text?.replace(/^:\s*/, '')
      const location = createSourceLocation(member, filePath)

      const visibility = extractVisibility(member)
      const isStatic = hasModifier(member, 'static')
      const isReadonly = hasModifier(member, 'readonly')

      properties.push({
        name,
        type,
        visibility,
        isStatic,
        isReadonly,
        location,
      })
    }
  }

  return properties
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
 * Extract all TypeScript functions from an AST
 */
export function extractTypeScriptFunctions(
  tree: Tree,
  filePath: string
): FunctionDefinition[] {
  const config = getLanguageConfig('typescript')
  const functions: FunctionDefinition[] = []

  // Use custom query if available, otherwise build from node types
  const queryString =
    config.functionQuery ||
    config.functionNodeTypes.map((type) => `(${type}) @function`).join('\n')

  const parser = getParser('typescript')
  const tsLanguage = parser.getLanguage()
  const query = new Parser.Query(tsLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    // Skip if not a function node
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
      qualifiedName: name, // Will be updated with class context later
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
 * Extract all TypeScript classes from an AST
 */
export function extractTypeScriptClasses(
  tree: Tree,
  filePath: string
): ClassDefinition[] {
  const config = getLanguageConfig('typescript')
  const classes: ClassDefinition[] = []

  const queryString =
    config.classQuery ||
    config.classNodeTypes.map((type) => `(${type}) @class`).join('\n')

  const parser = getParser('typescript')
  const tsLanguage = parser.getLanguage()
  const query = new Parser.Query(tsLanguage, queryString)

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

    // Determine kind
    let kind: 'class' | 'interface' | 'type' | 'enum' = 'class'
    if (node.type === 'interface_declaration') kind = 'interface'
    else if (node.type === 'type_alias_declaration') kind = 'type'
    else if (node.type === 'enum_declaration') kind = 'enum'
    else if (node.type === 'abstract_class_declaration') kind = 'class'

    // Extract heritage
    let extendsFrom: string[] = []
    let implementsInterfaces: string[] = []

    if (kind === 'class') {
      const heritage = extractHeritage(node)
      extendsFrom = heritage.extendsFrom
      implementsInterfaces = heritage.implementsInterfaces
    } else if (kind === 'interface') {
      extendsFrom = extractInterfaceExtends(node)
    }

    // Extract body
    const bodyNode = node.childForFieldName('body')
    const methods = bodyNode ? extractMethods(bodyNode, name, filePath) : []
    const properties = bodyNode ? extractProperties(bodyNode, filePath) : []

    const isAbstract = node.type === 'abstract_class_declaration' || hasModifier(node, 'abstract')

    classes.push({
      name,
      qualifiedName: name,
      kind,
      isExported: exported,
      isAbstract,
      extendsFrom,
      implements: implementsInterfaces,
      methods,
      properties,
      location,
      docComment,
    })
  }

  return classes
}

/**
 * Extract all TypeScript imports from an AST
 */
export function extractTypeScriptImports(
  tree: Tree,
  filePath: string
): ImportStatement[] {
  const config = getLanguageConfig('typescript')
  const imports: ImportStatement[] = []

  const queryString =
    config.importQuery ||
    config.importNodeTypes.map((type) => `(${type}) @import`).join('\n')

  const parser = getParser('typescript')
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
 * Extract all TypeScript exports from an AST
 */
export function extractTypeScriptExports(
  tree: Tree,
  filePath: string
): ExportStatement[] {
  const config = getLanguageConfig('typescript')
  const exports: ExportStatement[] = []

  const queryString =
    config.exportQuery ||
    config.exportNodeTypes.map((type) => `(${type}) @export`).join('\n')

  const parser = getParser('typescript')
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
