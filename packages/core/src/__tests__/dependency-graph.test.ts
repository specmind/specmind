import { describe, it, expect } from 'vitest'
import { resolve } from 'path'
import { buildDependencyGraph, findEntryPoints } from '../analyzer/dependency-graph.js'
import { analyzeFileContent } from '../analyzer/file-analyzer.js'
import type { FileAnalysis } from '../types/index.js'

describe('Dependency Graph', () => {
  describe('buildDependencyGraph', () => {
    it('should build graph from file analyses', () => {
      const indexPath = resolve('/test/index.ts')
      const typesPath = resolve('/test/types.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(indexPath, `import { User } from './types'`, 'typescript'),
        analyzeFileContent(typesPath, `export interface User {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(1)
      expect(deps[0].source).toBe(indexPath)
      expect(deps[0].target).toBe(typesPath)
      expect(deps[0].importedNames).toContain('User')
    })

    it('should handle multiple imports from same file', () => {
      const indexPath = resolve('/test/index.ts')
      const typesPath = resolve('/test/types.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(
          indexPath,
          `import { User, Admin } from './types'`,
          'typescript'
        ),
        analyzeFileContent(typesPath, `export interface User {}; export interface Admin {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(1)
      expect(deps[0].importedNames).toHaveLength(2)
      expect(deps[0].importedNames).toContain('User')
      expect(deps[0].importedNames).toContain('Admin')
    })

    it('should handle files with no imports', () => {
      const standalonePath = resolve('/test/standalone.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(standalonePath, `export const x = 1`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(0)
    })

    it('should handle multiple files with imports', () => {
      const aPath = resolve('/test/a.ts')
      const bPath = resolve('/test/b.ts')
      const cPath = resolve('/test/c.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(aPath, `import { B } from './b'`, 'typescript'),
        analyzeFileContent(bPath, `import { C } from './c'`, 'typescript'),
        analyzeFileContent(cPath, `export const x = 1`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)

      expect(deps).toHaveLength(2)
    })
  })

  describe('findEntryPoints', () => {
    it('should find files not imported by anyone', () => {
      const indexPath = resolve('/test/index.ts')
      const typesPath = resolve('/test/types.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(indexPath, `import { User } from './types'`, 'typescript'),
        analyzeFileContent(typesPath, `export interface User {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)
      const entryPoints = findEntryPoints(files, deps)

      expect(entryPoints).toContain(indexPath)
      expect(entryPoints).not.toContain(typesPath)
    })

    it('should return all files when no dependencies', () => {
      const aPath = resolve('/test/a.ts')
      const bPath = resolve('/test/b.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(aPath, `export const x = 1`, 'typescript'),
        analyzeFileContent(bPath, `export const y = 2`, 'typescript'),
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
      const cliPath = resolve('/test/cli.ts')
      const serverPath = resolve('/test/server.ts')
      const utilsPath = resolve('/test/utils.ts')

      const files: FileAnalysis[] = [
        analyzeFileContent(cliPath, `import { Utils } from './utils'`, 'typescript'),
        analyzeFileContent(serverPath, `import { Utils } from './utils'`, 'typescript'),
        analyzeFileContent(utilsPath, `export const Utils = {}`, 'typescript'),
      ]

      const deps = buildDependencyGraph(files)
      const entryPoints = findEntryPoints(files, deps)

      expect(entryPoints).toHaveLength(2)
      expect(entryPoints).toContain(cliPath)
      expect(entryPoints).toContain(serverPath)
      expect(entryPoints).not.toContain(utilsPath)
    })
  })
})
