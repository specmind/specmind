import { describe, it, expect } from 'vitest'
import { parseCode } from '../../analyzer/parser.js'
import { extractFunctions } from '../../analyzer/extractors/functions.js'

describe('Function Extractor', () => {
  it('should extract basic function', () => {
    const code = `
      function add(a: number, b: number): number {
        return a + b
      }
    `
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions).toHaveLength(1)
    expect(functions[0].name).toBe('add')
    expect(functions[0].parameters).toHaveLength(2)
    expect(functions[0].parameters[0].name).toBe('a')
    expect(functions[0].parameters[0].type).toBe('number')
    expect(functions[0].returnType).toBe('number')
    expect(functions[0].isAsync).toBe(false)
  })

  it('should extract async function', () => {
    const code = `
      async function fetchUser(id: string): Promise<User> {
        return await api.get(id)
      }
    `
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions).toHaveLength(1)
    expect(functions[0].name).toBe('fetchUser')
    expect(functions[0].isAsync).toBe(true)
    expect(functions[0].returnType).toBe('Promise<User>')
  })

  it('should extract exported function', () => {
    const code = `export function greet(name: string): string { return 'Hello' }`
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions).toHaveLength(1)
    expect(functions[0].isExported).toBe(true)
  })

  it('should extract arrow function', () => {
    const code = `const multiply = (a: number, b: number): number => a * b`
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions).toHaveLength(1)
    expect(functions[0].parameters).toHaveLength(2)
  })

  it('should extract function with optional parameters', () => {
    const code = `function greet(name: string, title?: string): string { return '' }`
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions).toHaveLength(1)
    expect(functions[0].parameters).toHaveLength(2)
    expect(functions[0].parameters[0].optional).toBe(false)
    expect(functions[0].parameters[1].optional).toBe(true)
  })

  it('should extract function with default parameters', () => {
    const code = `function greet(name: string = 'World'): string { return '' }`
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions).toHaveLength(1)
    expect(functions[0].parameters[0].defaultValue).toBeDefined()
  })

  it('should handle functions without return type', () => {
    const code = `function log(message) { console.log(message) }`
    const tree = parseCode(code, 'javascript')
    const functions = extractFunctions(tree, 'test.js', 'javascript')

    expect(functions).toHaveLength(1)
    expect(functions[0].returnType).toBeUndefined()
  })

  it('should extract multiple functions', () => {
    const code = `
      function fn1() {}
      function fn2() {}
      const fn3 = () => {}
    `
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions.length).toBeGreaterThanOrEqual(2)
  })

  it('should include source location', () => {
    const code = `function test() {}`
    const tree = parseCode(code, 'typescript')
    const functions = extractFunctions(tree, 'test.ts', 'typescript')

    expect(functions[0].location).toBeDefined()
    expect(functions[0].location.filePath).toBe('test.ts')
    expect(functions[0].location.startLine).toBeGreaterThan(0)
  })
})
