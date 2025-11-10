import type { Tree, SyntaxNode } from 'tree-sitter'
import Parser from 'tree-sitter'
import type {
  FunctionDefinition,
  ClassDefinition,
  ImportStatement,
  Parameter,
  MethodDefinition,
  PropertyDefinition,
} from '../../../types/index.js'
import { getLanguageConfig } from '../../language-config.js'
import { getParser } from '../../parser.js'
import { createSourceLocation } from './common.js'

/**
 * Extract method name from node
 */
function extractMethodName(node: SyntaxNode): string {
  const nameNode = node.childForFieldName('name')
  return nameNode?.text || 'anonymous'
}

/**
 * Extract return type from C# method
 */
function extractReturnType(node: SyntaxNode): string | undefined {
  const returnTypeNode = node.childForFieldName('type')
  if (!returnTypeNode) return undefined
  return returnTypeNode.text
}

/**
 * Check if method is async
 */
function isAsync(node: SyntaxNode): boolean {
  for (const child of node.children) {
    if (child.text === 'async') {
      return true
    }
  }
  return false
}

/**
 * Extract parameters from C# method
 */
function extractParameters(parametersNode: SyntaxNode | null): Parameter[] {
  if (!parametersNode) return []

  const parameters: Parameter[] = []

  for (const child of parametersNode.namedChildren) {
    if (child.type === 'parameter') {
      const typeNode = child.childForFieldName('type')
      const nameNode = child.childForFieldName('name')

      if (nameNode) {
        parameters.push({
          name: nameNode.text,
          type: typeNode?.text,
          optional: false,
        })
      }
    }
  }

  return parameters
}

/**
 * Extract base classes from class declaration
 */
function extractBaseClasses(node: SyntaxNode): string[] {
  const baseClasses: string[] = []

  const baseListNode = node.childForFieldName('bases')
  if (!baseListNode) return baseClasses

  for (const child of baseListNode.namedChildren) {
    baseClasses.push(child.text)
  }

  return baseClasses
}

/**
 * Determine if a base type is an interface (heuristic)
 */
function isInterface(baseName: string): boolean {
  // C# convention: interfaces start with 'I'
  const secondChar = baseName[1]
  return baseName.startsWith('I') && baseName.length > 1 && secondChar !== undefined && secondChar === secondChar.toUpperCase()
}

/**
 * Extract heritage (extends/implements) from class
 */
function extractHeritage(node: SyntaxNode): {
  extendsFrom: string[]
  implementsInterfaces: string[]
} {
  const baseClasses = extractBaseClasses(node)
  const extendsFrom: string[] = []
  const implementsInterfaces: string[] = []

  for (const base of baseClasses) {
    if (isInterface(base)) {
      implementsInterfaces.push(base)
    } else {
      extendsFrom.push(base)
    }
  }

  return { extendsFrom, implementsInterfaces }
}

/**
 * Extract interface extends
 */
function extractInterfaceExtends(node: SyntaxNode): string[] {
  return extractBaseClasses(node)
}

/**
 * Extract visibility modifier (public/private/protected/internal)
 */
function extractVisibility(
  node: SyntaxNode
): 'public' | 'private' | 'protected' {
  for (const child of node.children) {
    if (child.type === 'modifier') {
      const text = child.text
      if (text === 'private') return 'private'
      if (text === 'protected') return 'protected'
      if (text === 'public') return 'public'
      // Treat 'internal' as protected for simplicity
      if (text === 'internal') return 'protected'
    }
  }
  return 'public'
}

/**
 * Check if node has a specific modifier
 */
function hasModifier(node: SyntaxNode, modifier: string): boolean {
  for (const child of node.children) {
    if (child.type === 'modifier' && child.text === modifier) {
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
    if (member.type === 'method_declaration' || member.type === 'constructor_declaration') {
      const name = member.childForFieldName('name')?.text || 'Constructor'
      const paramsNode = member.childForFieldName('parameters')
      const parameters = extractParameters(paramsNode)
      const returnType = extractReturnType(member)
      const location = createSourceLocation(member, filePath)

      // Check for modifiers
      const visibility = extractVisibility(member)
      const isStatic = hasModifier(member, 'static')
      const isAbstract = hasModifier(member, 'abstract')
      const async = isAsync(member)
      const isExported = false // C# doesn't have direct exports

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
    if (member.type === 'property_declaration' || member.type === 'field_declaration') {
      const nameNode = member.childForFieldName('name')
      const name = nameNode?.text || 'unknown'

      const typeNode = member.childForFieldName('type')
      const type = typeNode?.text

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
 * Extract C# functions (methods)
 */
export function extractCSharpFunctions(
  tree: Tree,
  filePath: string
): FunctionDefinition[] {
  const config = getLanguageConfig('csharp')
  const functions: FunctionDefinition[] = []

  const queryString =
    config.functionQuery ||
    config.functionNodeTypes.map((type) => `(${type}) @function`).join('\n')

  const parser = getParser('csharp')
  const csLanguage = parser.getLanguage()
  const query = new Parser.Query(csLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    const name = extractMethodName(node)
    const paramsNode = node.childForFieldName('parameters')
    const parameters = extractParameters(paramsNode)
    const returnType = extractReturnType(node)
    const location = createSourceLocation(node, filePath)
    const async = isAsync(node)

    functions.push({
      name,
      qualifiedName: name,
      parameters,
      returnType,
      isExported: false,
      isAsync: async,
      location,
    })
  }

  return functions
}

/**
 * Extract C# classes
 */
export function extractCSharpClasses(
  tree: Tree,
  filePath: string
): ClassDefinition[] {
  const config = getLanguageConfig('csharp')
  const classes: ClassDefinition[] = []

  const queryString =
    config.classQuery ||
    config.classNodeTypes.map((type) => `(${type}) @class`).join('\n')

  const parser = getParser('csharp')
  const csLanguage = parser.getLanguage()
  const query = new Parser.Query(csLanguage, queryString)

  const captures = query.captures(tree.rootNode)

  for (const capture of captures) {
    const node = capture.node

    const nameNode = node.childForFieldName('name')
    if (!nameNode) continue

    const name = nameNode.text
    const location = createSourceLocation(node, filePath)

    // Determine kind
    let kind: 'class' | 'interface' | 'type' | 'enum' = 'class'
    if (node.type === 'interface_declaration') {
      kind = 'interface'
    } else if (node.type === 'enum_declaration') {
      kind = 'enum'
    } else if (node.type === 'record_declaration') {
      kind = 'type'
    } else if (node.type === 'struct_declaration') {
      kind = 'class'
    }

    // Extract inheritance
    let extendsFrom: string[] = []
    let implementsInterfaces: string[] = []

    if (kind === 'interface') {
      extendsFrom = extractInterfaceExtends(node)
    } else if (kind === 'class') {
      const heritage = extractHeritage(node)
      extendsFrom = heritage?.extendsFrom || []
      implementsInterfaces = heritage?.implementsInterfaces || []
    }

    // Extract methods and properties
    const bodyNode = node.childForFieldName('body')
    const methods = bodyNode ? extractMethods(bodyNode, name, filePath) : []
    const properties = bodyNode ? extractProperties(bodyNode, filePath) : []

    // Check for abstract modifier
    const isAbstract = hasModifier(node, 'abstract')

    classes.push({
      name,
      qualifiedName: name,
      kind,
      isExported: false,
      isAbstract,
      extendsFrom,
      implements: implementsInterfaces,
      methods,
      properties,
      location,
    })
  }

  return classes
}

/**
 * Extract C# imports (using directives)
 */
export function extractCSharpImports(
  tree: Tree,
  filePath: string
): ImportStatement[] {
  const imports: ImportStatement[] = []

  const usingNodes = tree.rootNode.descendantsOfType('using_directive')

  for (const node of usingNodes) {
    const nameNode = node.childForFieldName('name')
    if (!nameNode) continue

    imports.push({
      source: nameNode.text,
      imports: [
        {
          name: nameNode.text,
          isDefault: false,
          isNamespace: true,
        },
      ],
      location: createSourceLocation(node, filePath),
    })
  }

  return imports
}
