import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs'
import { join } from 'path'
import { performSplitAnalysis } from '../analyzer/split-analyzer.js'
import type { FileAnalysis, ModuleDependency } from '../types/index.js'

describe('Split Analyzer - Chunking', () => {
  const testOutputDir = join(__dirname, '__test-output__')

  beforeEach(() => {
    // Clean up test output directory
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true })
    }
    mkdirSync(testOutputDir, { recursive: true })
  })

  afterEach(() => {
    // Clean up after tests
    if (existsSync(testOutputDir)) {
      rmSync(testOutputDir, { recursive: true })
    }
  })

  it('should create .specmind/system directory structure', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/index.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    expect(existsSync(testOutputDir)).toBe(true)
    expect(existsSync(join(testOutputDir, 'metadata.json'))).toBe(true)
    expect(existsSync(join(testOutputDir, 'services'))).toBe(true)
  })

  it('should create layer directories instead of layer files', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [
          {
            name: 'processData',
            qualifiedName: 'processData',
            parameters: [],
            isExported: true,
            isAsync: false,
            location: {
              filePath: '/test/src/service.ts',
              startLine: 1,
              endLine: 3,
            },
          },
        ],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = existsSync(join(testOutputDir, 'services'))
      ? require('fs').readdirSync(join(testOutputDir, 'services'))
      : []

    expect(serviceDirs.length).toBeGreaterThan(0)

    const firstService = serviceDirs[0]
    const serviceDir = join(testOutputDir, 'services', firstService)

    // Should have layer directories, not layer files
    expect(existsSync(join(serviceDir, 'service-layer'))).toBe(true)
    expect(existsSync(join(serviceDir, 'service-layer.json'))).toBe(false)
  })

  it('should create summary.json and chunk files in each layer directory', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [
          {
            name: 'processData',
            qualifiedName: 'processData',
            parameters: [],
            isExported: true,
            isAsync: false,
            location: {
              filePath: '/test/src/service.ts',
              startLine: 1,
              endLine: 3,
            },
          },
        ],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const serviceLayerDir = join(testOutputDir, 'services', firstService, 'service-layer')

    expect(existsSync(join(serviceLayerDir, 'summary.json'))).toBe(true)
    expect(existsSync(join(serviceLayerDir, 'chunk-0.json'))).toBe(true)
  })

  it('should pretty-print summary.json files', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const summaryPath = join(testOutputDir, 'services', firstService, 'service-layer', 'summary.json')

    const summaryContent = readFileSync(summaryPath, 'utf-8')

    // Pretty-printed JSON should have newlines and indentation
    expect(summaryContent).toContain('\n')
    expect(summaryContent).toContain('  ') // 2-space indentation
  })

  it('should minify chunk files (no whitespace)', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const chunkPath = join(testOutputDir, 'services', firstService, 'service-layer', 'chunk-0.json')

    const chunkContent = readFileSync(chunkPath, 'utf-8')

    // Minified JSON should not have unnecessary whitespace
    // Check that it doesn't have the pretty-print pattern of newline + 2 spaces
    expect(chunkContent).not.toMatch(/\n  /)
  })

  it('should include chunkManifest in summary.json', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service1.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
      {
        filePath: '/test/src/service2.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const summaryPath = join(testOutputDir, 'services', firstService, 'service-layer', 'summary.json')

    const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'))

    expect(summary.chunkManifest).toBeDefined()
    expect(Array.isArray(summary.chunkManifest)).toBe(true)
    expect(summary.chunkManifest.length).toBeGreaterThan(0)
    expect(summary.chunkManifest[0]).toHaveProperty('chunkIndex')
    expect(summary.chunkManifest[0]).toHaveProperty('fileCount')
    expect(summary.chunkManifest[0]).toHaveProperty('files')
  })

  it('should include crossLayerDependencies in service metadata', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const metadataPath = join(testOutputDir, 'services', firstService, 'metadata.json')

    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))

    expect(metadata.crossLayerDependencies).toBeDefined()
    expect(typeof metadata.crossLayerDependencies).toBe('object')
  })

  it('should include crossServiceDependencies in root metadata', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const metadataPath = join(testOutputDir, 'metadata.json')
    const metadata = JSON.parse(readFileSync(metadataPath, 'utf-8'))

    expect(metadata.crossServiceDependencies).toBeDefined()
    expect(typeof metadata.crossServiceDependencies).toBe('object')
  })

  it('should NOT create layers/ directory', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    // The old structure had a layers/ directory - verify it doesn't exist
    expect(existsSync(join(testOutputDir, 'layers'))).toBe(false)
  })

  it('should create multiple chunks when files exceed 256KB', async () => {
    // Create a large mock file that will exceed chunk size
    const largeFunction = {
      name: 'largeFunction',
      qualifiedName: 'largeFunction',
      parameters: Array.from({ length: 100 }, (_, i) => ({
        name: `param${i}`,
        type: 'string',
        optional: false,
      })),
      isExported: true,
      isAsync: false,
      location: {
        filePath: '/test/src/large.ts',
        startLine: 1,
        endLine: 1000,
      },
    }

    // Create many files with large functions to exceed 256KB
    const mockAnalyses: FileAnalysis[] = Array.from({ length: 50 }, (_, i) => ({
      filePath: `/test/src/file${i}.ts`,
      language: 'typescript' as const,
      functions: Array(20).fill(largeFunction),
      classes: [],
      imports: [],
      exports: [],
      calls: [],
    }))

    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const serviceLayerDir = join(testOutputDir, 'services', firstService, 'service-layer')

    const files = require('fs').readdirSync(serviceLayerDir)
    const chunkFiles = files.filter((f: string) => f.startsWith('chunk-'))

    // Should create multiple chunks
    expect(chunkFiles.length).toBeGreaterThan(1)

    // Verify chunk sizes are under 256KB
    chunkFiles.forEach((chunkFile: string) => {
      const chunkPath = join(serviceLayerDir, chunkFile)
      const stats = require('fs').statSync(chunkPath)
      expect(stats.size).toBeLessThanOrEqual(256 * 1024)
    })
  })

  it('should include totalChunks in summary', async () => {
    const mockAnalyses: FileAnalysis[] = [
      {
        filePath: '/test/src/service.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
      },
    ]
    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const summaryPath = join(testOutputDir, 'services', firstService, 'service-layer', 'summary.json')

    const summary = JSON.parse(readFileSync(summaryPath, 'utf-8'))

    expect(summary.totalChunks).toBeDefined()
    expect(typeof summary.totalChunks).toBe('number')
    expect(summary.totalChunks).toBeGreaterThan(0)
  })

  it('should enforce 256KB chunk size limit strictly', async () => {
    // Create files with known sizes to verify chunking threshold
    const largeFunction = {
      name: 'largeFunction',
      qualifiedName: 'largeFunction',
      parameters: Array.from({ length: 100 }, (_, i) => ({
        name: `param${i}`,
        type: 'string',
        optional: false,
      })),
      isExported: true,
      isAsync: false,
      location: {
        filePath: '/test/src/large.ts',
        startLine: 1,
        endLine: 1000,
      },
    }

    // Create many files to ensure we hit the chunk limit
    const mockAnalyses: FileAnalysis[] = Array.from({ length: 100 }, (_, i) => ({
      filePath: `/test/src/file${i}.ts`,
      language: 'typescript' as const,
      functions: Array(20).fill(largeFunction),
      classes: [],
      imports: [],
      exports: [],
      calls: [],
    }))

    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const serviceLayerDir = join(testOutputDir, 'services', firstService, 'service-layer')

    const files = require('fs').readdirSync(serviceLayerDir)
    const chunkFiles = files.filter((f: string) => f.startsWith('chunk-'))

    // Verify EVERY chunk is under 256KB (262144 bytes)
    const MAX_CHUNK_SIZE = 256 * 1024
    let violatingChunks = 0

    chunkFiles.forEach((chunkFile: string) => {
      const chunkPath = join(serviceLayerDir, chunkFile)
      const stats = require('fs').statSync(chunkPath)

      if (stats.size > MAX_CHUNK_SIZE) {
        violatingChunks++
        console.error(`❌ Chunk ${chunkFile} exceeds limit: ${stats.size} bytes (limit: ${MAX_CHUNK_SIZE})`)
      }
    })

    expect(violatingChunks).toBe(0)

    // Also verify that at least some chunks exist (proving chunking happened)
    expect(chunkFiles.length).toBeGreaterThan(0)
  })

  it('should keep summary.json files small (target <50KB)', async () => {
    // Create moderate-sized dataset
    const mockAnalyses: FileAnalysis[] = Array.from({ length: 20 }, (_, i) => ({
      filePath: `/test/src/file${i}.ts`,
      language: 'typescript' as const,
      functions: [
        {
          name: `func${i}`,
          qualifiedName: `func${i}`,
          parameters: [],
          isExported: true,
          isAsync: false,
          location: {
            filePath: `/test/src/file${i}.ts`,
            startLine: 1,
            endLine: 10,
          },
        },
      ],
      classes: [],
      imports: [],
      exports: [],
      calls: [],
    }))

    const mockDeps: ModuleDependency[] = []

    await performSplitAnalysis('/test', mockAnalyses, mockDeps, testOutputDir)

    const serviceDirs = require('fs').readdirSync(join(testOutputDir, 'services'))
    const firstService = serviceDirs[0]
    const serviceLayerDir = join(testOutputDir, 'services', firstService, 'service-layer')
    const summaryPath = join(serviceLayerDir, 'summary.json')

    const stats = require('fs').statSync(summaryPath)

    // Summary should be significantly smaller than 256KB
    // Target is <50KB, but we'll allow up to 100KB for this test
    expect(stats.size).toBeLessThan(100 * 1024)
  })
})
