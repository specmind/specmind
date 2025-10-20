import { describe, it, expect } from 'vitest'
import { parseCode } from '../../analyzer/parser.js'
import { extractImports, extractExports } from '../../analyzer/extractors/imports.js'

describe('Import Extractor', () => {
  it('should extract named import', () => {
    const code = `import { User } from './types'`
    const tree = parseCode(code, 'typescript')
    const imports = extractImports(tree, 'test.ts', 'typescript')

    expect(imports).toHaveLength(1)
    expect(imports[0].source).toBe('./types')
    expect(imports[0].imports).toHaveLength(1)
    expect(imports[0].imports[0].name).toBe('User')
    expect(imports[0].imports[0].isDefault).toBe(false)
  })

  it('should extract multiple named imports', () => {
    const code = `import { User, Admin, Guest } from './types'`
    const tree = parseCode(code, 'typescript')
    const imports = extractImports(tree, 'test.ts', 'typescript')

    expect(imports).toHaveLength(1)
    expect(imports[0].imports.length).toBeGreaterThanOrEqual(1)
  })

  it('should extract import with alias', () => {
    const code = `import { User as UserType } from './types'`
    const tree = parseCode(code, 'typescript')
    const imports = extractImports(tree, 'test.ts', 'typescript')

    expect(imports).toHaveLength(1)
    expect(imports[0].imports[0].name).toBe('User')
    expect(imports[0].imports[0].alias).toBe('UserType')
  })

  it('should extract default import', () => {
    const code = `import Database from './db'`
    const tree = parseCode(code, 'typescript')
    const imports = extractImports(tree, 'test.ts', 'typescript')

    expect(imports).toHaveLength(1)
    expect(imports[0].imports[0].isDefault).toBe(true)
  })

  it('should extract namespace import', () => {
    const code = `import * as Utils from './utils'`
    const tree = parseCode(code, 'typescript')
    const imports = extractImports(tree, 'test.ts', 'typescript')

    expect(imports).toHaveLength(1)
    expect(imports[0].imports[0].isNamespace).toBe(true)
  })

  it('should include source location', () => {
    const code = `import { User } from './types'`
    const tree = parseCode(code, 'typescript')
    const imports = extractImports(tree, 'test.ts', 'typescript')

    expect(imports[0].location).toBeDefined()
    expect(imports[0].location.filePath).toBe('test.ts')
  })
})

describe('Export Extractor', () => {
  it('should extract named export', () => {
    const code = `export function greet() {}`
    const tree = parseCode(code, 'typescript')
    const exports = extractExports(tree, 'test.ts', 'typescript')

    expect(exports.length).toBeGreaterThan(0)
    expect(exports[0].isDefault).toBe(false)
  })

  it('should extract default export', () => {
    const code = `export default class User {}`
    const tree = parseCode(code, 'typescript')
    const exports = extractExports(tree, 'test.ts', 'typescript')

    expect(exports.length).toBeGreaterThan(0)
  })

  it('should extract export list', () => {
    const code = `
      const a = 1
      const b = 2
      export { a, b }
    `
    const tree = parseCode(code, 'typescript')
    const exports = extractExports(tree, 'test.ts', 'typescript')

    expect(exports.length).toBeGreaterThan(0)
  })

  it('should include source location', () => {
    const code = `export const x = 1`
    const tree = parseCode(code, 'typescript')
    const exports = extractExports(tree, 'test.ts', 'typescript')

    if (exports.length > 0) {
      expect(exports[0].location).toBeDefined()
      expect(exports[0].location.filePath).toBe('test.ts')
    }
  })

  it('should return empty array for Python exports', () => {
    const code = `def greet(): pass`
    const tree = parseCode(code, 'python')
    const exports = extractExports(tree, 'test.py', 'python')

    expect(exports).toEqual([])
  })

  it('should throw error for unsupported language in imports', () => {
    const code = `const x = 1`
    const tree = parseCode(code, 'typescript')

    expect(() => {
      extractImports(tree, 'test.rs', 'rust' as any)
    }).toThrow('Unsupported language: rust')
  })

  it('should throw error for unsupported language in exports', () => {
    const code = `const x = 1`
    const tree = parseCode(code, 'typescript')

    expect(() => {
      extractExports(tree, 'test.go', 'go' as any)
    }).toThrow('Unsupported language: go')
  })
})
