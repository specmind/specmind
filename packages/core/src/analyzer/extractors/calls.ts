import type { Tree, SyntaxNode } from 'tree-sitter'
import type { CallExpression, SupportedLanguage, SourceLocation } from '../../types/index.js'

/**
 * Extract all function/method calls from an AST
 */
export function extractCalls(
  tree: Tree,
  filePath: string,
  _language: SupportedLanguage,
  functionContext: Map<number, string> // Map of line number to function/method name
): CallExpression[] {
  const sourceCode = tree.rootNode.text
  const calls: CallExpression[] = []

  // Traverse the tree to find call expressions
  function traverse(node: SyntaxNode) {
    if (node.type === 'call_expression') {
      const call = extractCallExpression(node, filePath, sourceCode, functionContext)
      if (call) {
        calls.push(call)
      }
    }

    // Recursively traverse children
    for (const child of node.children) {
      traverse(child)
    }
  }

  traverse(tree.rootNode)
  return calls
}

/**
 * Extract a single call expression from a node
 */
function extractCallExpression(
  callNode: SyntaxNode,
  filePath: string,
  sourceCode: string,
  functionContext: Map<number, string>
): CallExpression | null {
  const functionNode = callNode.childForFieldName('function')
  const argumentsNode = callNode.childForFieldName('arguments')

  if (!functionNode) return null

  // Determine caller (which function/method contains this call)
  const callerLine = callNode.startPosition.row
  const callerName = functionContext.get(callerLine) || '<module>'
  const callerQualifiedName = callerName

  // Extract callee information
  let calleeName = ''
  let calleeQualifiedName: string | undefined
  let isMethodCall = false
  let receiver: string | undefined

  // Check if it's a method call (obj.method()) or function call (func())
  if (functionNode.type === 'member_expression') {
    // Method call: obj.method()
    isMethodCall = true
    const objectNode = functionNode.childForFieldName('object')
    const propertyNode = functionNode.childForFieldName('property')

    if (objectNode && propertyNode) {
      receiver = sourceCode.slice(objectNode.startIndex, objectNode.endIndex)
      calleeName = sourceCode.slice(propertyNode.startIndex, propertyNode.endIndex)
      calleeQualifiedName = `${receiver}.${calleeName}`
    }
  } else {
    // Regular function call: func()
    calleeName = sourceCode.slice(functionNode.startIndex, functionNode.endIndex)
    calleeQualifiedName = calleeName
  }

  // Extract arguments
  const args: string[] = []
  if (argumentsNode) {
    for (const argNode of argumentsNode.namedChildren) {
      const argText = sourceCode.slice(argNode.startIndex, argNode.endIndex)
      args.push(argText)
    }
  }

  // Get location
  const location: SourceLocation = {
    filePath,
    startLine: callNode.startPosition.row + 1,
    endLine: callNode.endPosition.row + 1,
    startColumn: callNode.startPosition.column,
    endColumn: callNode.endPosition.column,
  }

  return {
    callerName,
    callerQualifiedName,
    calleeName,
    calleeQualifiedName,
    arguments: args,
    location,
    isMethodCall,
    receiver,
  }
}

/**
 * Build a map of line numbers to function/method names for context
 */
export function buildFunctionContext(
  functions: Array<{ name: string; qualifiedName: string; location: SourceLocation }>,
  classes: Array<{ name: string; methods: Array<{ name: string; qualifiedName: string; location: SourceLocation }> }>
): Map<number, string> {
  const context = new Map<number, string>()

  // Add standalone functions
  for (const func of functions) {
    for (let line = func.location.startLine; line <= func.location.endLine; line++) {
      context.set(line - 1, func.qualifiedName) // Tree-sitter uses 0-indexed lines
    }
  }

  // Add class methods
  for (const cls of classes) {
    for (const method of cls.methods) {
      for (let line = method.location.startLine; line <= method.location.endLine; line++) {
        context.set(line - 1, method.qualifiedName)
      }
    }
  }

  return context
}
