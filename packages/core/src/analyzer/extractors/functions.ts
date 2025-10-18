import type { Tree, SyntaxNode } from 'tree-sitter'
import Parser from 'tree-sitter'
import type {
  FunctionDefinition,
  Parameter,
  SourceLocation,
  SupportedLanguage,
} from '../../types/index.js'
import { getLanguageConfig } from '../language-config.js'
import { getParser } from '../parser.js'

/**
 * Extract function name from node
 */
function extractFunctionName(node: SyntaxNode): string {
  const nameNode = node.childForFieldName('name')
  return nameNode?.text || 'anonymous'
}

/**
 * Extract parameters from formal_parameters node
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
 * Extract return type from node
 */
function extractReturnType(node: SyntaxNode): string | undefined {
  const returnTypeNode = node.childForFieldName('return_type')
  if (!returnTypeNode) return undefined

  return returnTypeNode.text.replace(/^:\s*/, '')
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
 * Extract JSDoc comment if available
 */
function extractDocComment(node: SyntaxNode): string | undefined {
  const previousSibling = node.previousNamedSibling
  if (previousSibling?.type === 'comment') {
    const text = previousSibling.text
    // Check if it's a JSDoc comment (starts with /**)
    if (text.startsWith('/**')) {
      return text
    }
  }
  return undefined
}

/**
 * Extract all functions from an AST
 */
export function extractFunctions(
  tree: Tree,
  filePath: string,
  language: SupportedLanguage
): FunctionDefinition[] {
  const config = getLanguageConfig(language)
  const functions: FunctionDefinition[] = []

  // Use custom query if available, otherwise build from node types
  const queryString =
    config.functionQuery ||
    config.functionNodeTypes.map((type) => `(${type}) @function`).join('\n')

  const parser = getParser(language)
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
