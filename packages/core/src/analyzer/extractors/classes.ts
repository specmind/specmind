import type { Tree, SyntaxNode } from 'tree-sitter'
import Parser from 'tree-sitter'
import type {
  ClassDefinition,
  MethodDefinition,
  PropertyDefinition,
  SourceLocation,
  SupportedLanguage,
} from '../../types/index.js'
import { getLanguageConfig } from '../language-config.js'
import { getParser } from '../parser.js'

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
      const isAsync = hasModifier(member, 'async')
      const isExported = false // Methods aren't directly exported

      methods.push({
        name,
        qualifiedName: `${className}.${name}`,
        parameters,
        returnType,
        isExported,
        isAsync,
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
 * Check if class is exported
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
 * Extract parameters (reuse from functions.ts logic)
 */
function extractParameters(paramsNode: SyntaxNode | null): any[] {
  if (!paramsNode) return []

  const parameters: any[] = []

  for (const child of paramsNode.namedChildren) {
    if (child.type === 'required_parameter' || child.type === 'optional_parameter') {
      const pattern = child.childForFieldName('pattern')
      const typeAnnotation = child.childForFieldName('type')
      const value = child.childForFieldName('value')

      parameters.push({
        name: pattern?.text || 'unknown',
        type: typeAnnotation?.text?.replace(/^:\s*/, ''),
        optional: child.type === 'optional_parameter',
        defaultValue: value?.text,
      })
    }
  }

  return parameters
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
 * Extract doc comment
 */
function extractDocComment(node: SyntaxNode): string | undefined {
  const previousSibling = node.previousNamedSibling
  if (previousSibling?.type === 'comment') {
    const text = previousSibling.text
    if (text.startsWith('/**')) {
      return text
    }
  }
  return undefined
}

/**
 * Extract all classes from an AST
 */
export function extractClasses(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): ClassDefinition[] {
  const config = getLanguageConfig(language)
  const classes: ClassDefinition[] = []

  const queryString =
    config.classQuery ||
    config.classNodeTypes.map((type) => `(${type}) @class`).join('\n')

  const parser = getParser(language)
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
