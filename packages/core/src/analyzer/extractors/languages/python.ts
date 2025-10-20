import type { SyntaxNode, Tree } from 'tree-sitter'
import type {
  FunctionDefinition,
  ClassDefinition,
  ImportStatement,
  Parameter,
  MethodDefinition,
} from '../../../types/index.js'
import { createSourceLocation } from './common.js'

/**
 * Extract parameters from Python function
 */
function extractParameters(parametersNode: SyntaxNode): Parameter[] {
  const params: Parameter[] = []

  for (const child of parametersNode.children) {
    // Handle typed parameters like "name: str"
    if (child.type === 'typed_parameter') {
      const nameNode = child.childForFieldName('type')?.previousSibling?.previousSibling // identifier before ':'
      const typeNode = child.childForFieldName('type')

      if (nameNode) {
        params.push({
          name: nameNode.text,
          type: typeNode?.text,
          optional: false,
        })
      }
    }
    // Handle typed default parameters like "greeting: str = "Hello""
    else if (child.type === 'typed_default_parameter') {
      // Find identifier (first child)
      const nameNode = child.children.find(c => c.type === 'identifier')
      const typeNode = child.childForFieldName('type')
      // Find default value (after '=')
      const valueNode = child.children.find(c => c.previousSibling?.type === '=')

      if (nameNode) {
        params.push({
          name: nameNode.text,
          type: typeNode?.text,
          optional: true,
          defaultValue: valueNode?.text,
        })
      }
    }
    // Handle regular identifiers like "self" or "db_connection"
    else if (child.type === 'identifier') {
      params.push({
        name: child.text,
        optional: false,
      })
    }
    // Handle default parameters like "timeout=30"
    else if (child.type === 'default_parameter') {
      const nameNode = child.childForFieldName('name')
      const valueNode = child.childForFieldName('value')

      if (nameNode) {
        params.push({
          name: nameNode.text,
          optional: true,
          defaultValue: valueNode?.text,
        })
      }
    }
  }

  return params
}

/**
 * Extract Python function definitions with parameters
 */
export function extractPythonFunctions(
  tree: Tree,
  filePath: string
): FunctionDefinition[] {
  const functions: FunctionDefinition[] = []
  const functionNodes = tree.rootNode.descendantsOfType('function_definition')

  for (const node of functionNodes) {
    // Skip functions that are inside classes (those are methods)
    let parent = node.parent
    while (parent) {
      if (parent.type === 'class_definition') {
        break
      }
      parent = parent.parent
    }
    if (parent?.type === 'class_definition') {
      continue // This is a method, not a standalone function
    }

    const nameNode = node.childForFieldName('name')
    const parametersNode = node.childForFieldName('parameters')
    const returnTypeNode = node.childForFieldName('return_type')

    if (!nameNode) continue

    const parameters = parametersNode ? extractParameters(parametersNode) : []

    functions.push({
      name: nameNode.text,
      qualifiedName: nameNode.text,
      parameters,
      returnType: returnTypeNode?.text,
      isExported: false, // Python doesn't have explicit exports
      isAsync: node.text.trim().startsWith('async def'),
      location: createSourceLocation(node, filePath),
    })
  }

  return functions
}

/**
 * Extract Python class definitions with methods
 */
export function extractPythonClasses(tree: Tree, filePath: string): ClassDefinition[] {
  const classes: ClassDefinition[] = []
  const classNodes = tree.rootNode.descendantsOfType('class_definition')

  for (const node of classNodes) {
    const nameNode = node.childForFieldName('name')
    if (!nameNode) continue

    // Extract methods from class body
    const methods: MethodDefinition[] = []
    const blockNode = node.childForFieldName('body')

    if (blockNode) {
      const methodNodes = blockNode.descendantsOfType('function_definition')

      for (const methodNode of methodNodes) {
        // Make sure this function is directly in this class, not in a nested class
        if (methodNode.parent !== blockNode) continue

        const methodNameNode = methodNode.childForFieldName('name')
        const parametersNode = methodNode.childForFieldName('parameters')
        const returnTypeNode = methodNode.childForFieldName('return_type')

        if (!methodNameNode) continue

        const parameters = parametersNode ? extractParameters(parametersNode) : []

        methods.push({
          name: methodNameNode.text,
          qualifiedName: `${nameNode.text}.${methodNameNode.text}`,
          parameters,
          returnType: returnTypeNode?.text,
          isExported: false,
          isAsync: methodNode.text.trim().startsWith('async def'),
          location: createSourceLocation(methodNode, filePath),
          visibility: methodNameNode.text.startsWith('_') ? 'private' : 'public',
          isStatic: false, // Python uses @staticmethod decorator
          isAbstract: false,
        })
      }
    }

    classes.push({
      name: nameNode.text,
      qualifiedName: nameNode.text,
      kind: 'class',
      isExported: false, // Python doesn't have explicit exports
      isAbstract: false, // TODO: Detect ABC classes
      extendsFrom: [], // TODO: Extract base classes
      implements: [], // Python doesn't have interfaces
      methods,
      properties: [], // TODO: Extract class properties
      location: createSourceLocation(node, filePath),
    })
  }

  return classes
}

/**
 * Extract Python import statements
 */
export function extractPythonImports(tree: Tree, filePath: string): ImportStatement[] {
  const imports: ImportStatement[] = []

  // Handle "import os", "import sys"
  const importNodes = tree.rootNode.descendantsOfType('import_statement')
  for (const node of importNodes) {
    const dottedNames = node.descendantsOfType('dotted_name')

    for (const nameNode of dottedNames) {
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
  }

  // Handle "from typing import List, Optional"
  const importFromNodes = tree.rootNode.descendantsOfType('import_from_statement')
  for (const node of importFromNodes) {
    const moduleNode = node.childForFieldName('module_name')
    if (!moduleNode) continue

    const importedItems: Array<{ name: string; isDefault: boolean; isNamespace: boolean }> = []
    const dottedNames = node.children.filter((child) => child.type === 'dotted_name')

    // Skip the first dotted_name (that's the module), get the rest (imported names)
    for (let i = 1; i < dottedNames.length; i++) {
      const nameNode = dottedNames[i]
      if (nameNode) {
        importedItems.push({
          name: nameNode.text,
          isDefault: false,
          isNamespace: false,
        })
      }
    }

    imports.push({
      source: moduleNode.text,
      imports: importedItems,
      location: createSourceLocation(node, filePath),
    })
  }

  return imports
}
