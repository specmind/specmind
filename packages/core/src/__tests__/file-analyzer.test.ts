import { describe, it, expect } from 'vitest'
import { readFile } from 'fs/promises'
import { analyzeFile, analyzeFileContent } from '../analyzer/file-analyzer.js'

describe('File Analyzer', () => {
  it('should analyze complete TypeScript file', () => {
    const code = `
      import { Database } from './database'

      export class UserService {
        constructor(private db: Database) {}

        async getUser(id: string): Promise<User> {
          return await this.db.find(id)
        }
      }

      export interface User {
        id: string
        name: string
      }

      export function formatUser(user: User): string {
        return user.name
      }
    `

    const analysis = analyzeFileContent('user-service.ts', code, 'typescript')

    expect(analysis.filePath).toBe('user-service.ts')
    expect(analysis.language).toBe('typescript')
    expect(analysis.classes).toHaveLength(2) // UserService + User interface
    expect(analysis.functions.length).toBeGreaterThan(0)
    expect(analysis.imports).toHaveLength(1)
    expect(analysis.exports.length).toBeGreaterThan(0)
  })

  it('should analyze JavaScript file', () => {
    const code = `
      export class Calculator {
        add(a, b) {
          return a + b
        }
      }
    `

    const analysis = analyzeFileContent('calculator.js', code, 'javascript')

    expect(analysis.language).toBe('javascript')
    expect(analysis.classes).toHaveLength(1)
  })

  it('should analyze Python file', () => {
    const code = `
from typing import List

class UserService:
    def __init__(self, db):
        self.db = db

    def get_users(self) -> List[str]:
        return []

def format_user(name: str) -> str:
    return f"User: {name}"
    `

    const analysis = analyzeFileContent('user_service.py', code, 'python')

    expect(analysis.language).toBe('python')
    expect(analysis.classes).toHaveLength(1)
    expect(analysis.functions.length).toBeGreaterThan(0)
    expect(analysis.imports).toHaveLength(1)
    expect(analysis.exports).toHaveLength(0) // Python doesn't have explicit exports
  })

  it('should handle empty file', () => {
    const code = ''
    const analysis = analyzeFileContent('empty.ts', code, 'typescript')

    expect(analysis.functions).toHaveLength(0)
    expect(analysis.classes).toHaveLength(0)
    expect(analysis.imports).toHaveLength(0)
  })

  it('should handle file with only imports', () => {
    const code = `
      import { A } from './a'
      import { B } from './b'
    `
    const analysis = analyzeFileContent('imports.ts', code, 'typescript')

    expect(analysis.imports).toHaveLength(2)
    expect(analysis.functions).toHaveLength(0)
  })

  it('should extract all elements from sample fixture', async () => {
    const fixturePath = new URL('./fixtures/sample.ts', import.meta.url).pathname
    const code = await readFile(fixturePath, 'utf-8')

    const analysis = analyzeFileContent('sample.ts', code, 'typescript')

    // Should have UserService class
    expect(analysis.classes.some(c => c.name === 'UserService')).toBe(true)

    // Should have User interface
    expect(analysis.classes.some(c => c.name === 'User' && c.kind === 'interface')).toBe(true)

    // Should have UserRole enum
    expect(analysis.classes.some(c => c.name === 'UserRole' && c.kind === 'enum')).toBe(true)

    // Should have formatUserName function
    expect(analysis.functions.some(f => f.name === 'formatUserName')).toBe(true)

    // Should have imports
    expect(analysis.imports.length).toBeGreaterThan(0)

    // Should have exports
    expect(analysis.exports.length).toBeGreaterThan(0)
  })

  it('should analyze file from filesystem using analyzeFile', async () => {
    const fixturePath = new URL('./fixtures/sample.ts', import.meta.url).pathname
    const analysis = await analyzeFile(fixturePath)

    expect(analysis).toBeDefined()
    expect(analysis!.filePath).toBe(fixturePath)
    expect(analysis!.language).toBe('typescript')
    expect(analysis!.classes.length).toBeGreaterThan(0)
    expect(analysis!.functions.length).toBeGreaterThan(0)
  })

  it('should return null for unsupported file types', async () => {
    const result = await analyzeFile('test.txt')
    expect(result).toBeNull()
  })

  it('should throw error for non-existent file', async () => {
    await expect(analyzeFile('non-existent-file.ts')).rejects.toThrow('Failed to analyze file')
  })

  it('should throw error for unsupported language', () => {
    const code = `class Test {}`
    expect(() => {
      analyzeFileContent('test.rb', code, 'ruby' as any)
    }).toThrow('Unsupported language: ruby')
  })
})
