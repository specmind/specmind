import { describe, it, expect } from 'vitest'
import { buildDependencyGraph, findEntryPoints } from '../analyzer/dependency-graph.js'
import { analyzeFileContent } from '../analyzer/file-analyzer.js'
import type { FileAnalysis } from '../types/index.js'

describe('Dependency Graph', () => {
  describe('buildDependencyGraph', () => {
    it('should build graph from file analyses', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent('index.ts', `import { User } from './types'`, 'typescript'),
        analyzeFileContent('types.ts', `export interface User {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(1)
      expect(deps[0].source).toBe('index.ts')
      expect(deps[0].target).toBe('./types')
      expect(deps[0].importedNames).toContain('User')
    })

    it('should handle multiple imports from same file', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent(
          'index.ts',
          `import { User, Admin } from './types'`,
          'typescript'
        ),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(1)
      expect(deps[0].importedNames).toHaveLength(2)
      expect(deps[0].importedNames).toContain('User')
      expect(deps[0].importedNames).toContain('Admin')
    })

    it('should handle files with no imports', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent('standalone.ts', `export const x = 1`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(0)
    })

    it('should handle multiple files with imports', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent('a.ts', `import { B } from './b'`, 'typescript'),
        analyzeFileContent('b.ts', `import { C } from './c'`, 'typescript'),
        analyzeFileContent('c.ts', `export const x = 1`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(2)
    })
  })

  describe('findEntryPoints', () => {
    it('should find files not imported by anyone', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent('index.ts', `import { User } from './types'`, 'typescript'),
        analyzeFileContent('types.ts', `export interface User {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)
      const entryPoints = findEntryPoints(files, deps)

      expect(entryPoints).toContain('index.ts')
      expect(entryPoints).not.toContain('types.ts')
    })

    it('should return all files when no dependencies', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent('a.ts', `export const x = 1`, 'typescript'),
        analyzeFileContent('b.ts', `export const y = 2`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)
      const entryPoints = findEntryPoints(files, deps)

      expect(entryPoints).toHaveLength(2)
    })

    it('should handle empty files list', () => {
      const entryPoints = findEntryPoints([], [])
      expect(entryPoints).toHaveLength(0)
    })

    it('should identify multiple entry points', () => {
      const files: FileAnalysis[] = [
        analyzeFileContent('cli.ts', `import { Utils } from './utils'`, 'typescript'),
        analyzeFileContent('server.ts', `import { Utils } from './utils'`, 'typescript'),
        analyzeFileContent('utils.ts', `export const Utils = {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)
      const entryPoints = findEntryPoints(files, deps)

      expect(entryPoints).toHaveLength(2)
      expect(entryPoints).toContain('cli.ts')
      expect(entryPoints).toContain('server.ts')
      expect(entryPoints).not.toContain('utils.ts')
    })
  })
})
