import { describe, it, expect } from 'vitest'
import { getParser, parseCode } from '../analyzer/parser.js'

describe('Parser', () => {
  describe('getParser', () => {
    it('should create TypeScript parser', () => {
      const parser = getParser('typescript')
      expect(parser).toBeDefined()
      expect(parser.getLanguage()).toBeDefined()
    })

    it('should create JavaScript parser', () => {
      const parser = getParser('javascript')
      expect(parser).toBeDefined()
      expect(parser.getLanguage()).toBeDefined()
    })

    it('should cache parsers', () => {
      const parser1 = getParser('typescript')
      const parser2 = getParser('typescript')
      expect(parser1).toBe(parser2)
    })

    it('should throw error for unsupported language', () => {
      expect(() => getParser('python' as any)).toThrow('Unsupported language')
    })
  })

  describe('parseCode', () => {
    it('should parse valid TypeScript code', () => {
      const code = 'const x: number = 42'
      const tree = parseCode(code, 'typescript')

      expect(tree).toBeDefined()
      expect(tree.rootNode).toBeDefined()
      expect(tree.rootNode.type).toBe('program')
    })

    it('should parse valid JavaScript code', () => {
      const code = 'const x = 42'
      const tree = parseCode(code, 'javascript')

      expect(tree).toBeDefined()
      expect(tree.rootNode).toBeDefined()
      expect(tree.rootNode.type).toBe('program')
    })

    it('should parse code with syntax errors', () => {
      const code = 'const x = {'
      const tree = parseCode(code, 'typescript')

      expect(tree).toBeDefined()
      expect(tree.rootNode.hasError).toBe(true)
    })

    it('should parse empty code', () => {
      const code = ''
      const tree = parseCode(code, 'typescript')

      expect(tree).toBeDefined()
      expect(tree.rootNode).toBeDefined()
    })
  })
})
