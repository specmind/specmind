import { describe, it, expect } from 'vitest'
import { detectLanguage, getLanguageConfig } from '../analyzer/language-config.js'

describe('Language Config', () => {
  describe('detectLanguage', () => {
    it('should detect TypeScript files', () => {
      expect(detectLanguage('app.ts')).toBe('typescript')
      expect(detectLanguage('component.tsx')).toBe('typescript')
      expect(detectLanguage('/path/to/file.ts')).toBe('typescript')
    })

    it('should detect JavaScript files', () => {
      expect(detectLanguage('app.js')).toBe('javascript')
      expect(detectLanguage('component.jsx')).toBe('javascript')
      expect(detectLanguage('/path/to/file.js')).toBe('javascript')
    })

    it('should return null for unsupported files', () => {
      expect(detectLanguage('styles.css')).toBeNull()
      expect(detectLanguage('doc.md')).toBeNull()
      expect(detectLanguage('data.json')).toBeNull()
      expect(detectLanguage('image.png')).toBeNull()
    })

    it('should handle files without extension', () => {
      expect(detectLanguage('README')).toBeNull()
      expect(detectLanguage('Makefile')).toBeNull()
    })
  })

  describe('getLanguageConfig', () => {
    it('should get TypeScript config', () => {
      const config = getLanguageConfig('typescript')

      expect(config.name).toBe('typescript')
      expect(config.fileExtensions).toContain('.ts')
      expect(config.fileExtensions).toContain('.tsx')
      expect(config.functionNodeTypes.length).toBeGreaterThan(0)
      expect(config.classNodeTypes.length).toBeGreaterThan(0)
    })

    it('should get JavaScript config', () => {
      const config = getLanguageConfig('javascript')

      expect(config.name).toBe('javascript')
      expect(config.fileExtensions).toContain('.js')
      expect(config.fileExtensions).toContain('.jsx')
      expect(config.functionNodeTypes.length).toBeGreaterThan(0)
    })

    it('should throw for unsupported language', () => {
      expect(() => getLanguageConfig('python' as any)).toThrow('Unsupported language')
    })

    it('should have custom queries for TypeScript', () => {
      const config = getLanguageConfig('typescript')

      expect(config.functionQuery).toBeDefined()
      expect(config.classQuery).toBeDefined()
      expect(config.importQuery).toBeDefined()
      expect(config.exportQuery).toBeDefined()
    })
  })
})
