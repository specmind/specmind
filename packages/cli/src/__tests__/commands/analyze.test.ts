import { describe, it, expect, vi, beforeEach } from 'vitest'
import { analyzeCommand } from '../../commands/analyze.js'
import type { AnalyzeOptions } from '../../commands/analyze.js'

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit called with code ${code}`)
})

// Mock the core analyzer
vi.mock('@specmind/core', () => ({
  analyzeFile: vi.fn().mockResolvedValue({
    filePath: '/test/file.ts',
    language: 'typescript',
    functions: [
      {
        name: 'testFunction',
        qualifiedName: 'testFunction',
        parameters: [{ name: 'arg1', type: 'string' }],
        returnType: 'void',
        isExported: true,
        isAsync: false,
        location: { filePath: '/test/file.ts', startLine: 1, endLine: 5 }
      }
    ],
    classes: [],
    imports: [],
    exports: [],
    calls: []
  }),
  buildDependencyGraph: vi.fn().mockReturnValue([]),
  detectLanguage: vi.fn().mockReturnValue('typescript'), // Mock detectLanguage to return typescript
  performSplitAnalysis: vi.fn().mockResolvedValue(undefined) // Mock split analysis
}))

// Mock fs
vi.mock('fs', () => ({
  readdirSync: vi.fn().mockReturnValue(['file.ts']),
  statSync: vi.fn().mockReturnValue({
    isDirectory: () => false,
    isFile: () => true
  }),
  existsSync: vi.fn().mockReturnValue(false), // No .gitignore by default
  readFileSync: vi.fn().mockReturnValue(''),
  mkdirSync: vi.fn() // Mock for creating directories
}))

// Mock ignore library
vi.mock('ignore', () => ({
  default: vi.fn(() => ({
    add: vi.fn(),
    ignores: vi.fn().mockReturnValue(false) // Don't ignore anything by default
  }))
}))

// Mock console to suppress output during tests
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('analyzeCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should analyze with default options', async () => {
    const options: AnalyzeOptions = {
      path: process.cwd()
    }

    await analyzeCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should analyze with custom path', async () => {
    const options: AnalyzeOptions = {
      path: '/custom/path'
    }

    await analyzeCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const { buildDependencyGraph } = await import('@specmind/core')
    vi.mocked(buildDependencyGraph).mockImplementationOnce(() => {
      throw new Error('Graph building failed')
    })

    const options: AnalyzeOptions = {
      path: process.cwd()
    }

    try {
      await analyzeCommand(options)
    } catch (error) {
      // Expect process.exit to be called
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('process.exit called')
    }

    expect(mockConsoleError).toHaveBeenCalled()
  })

  it('should handle no files found', async () => {
    const { readdirSync } = await import('fs')
    vi.mocked(readdirSync).mockReturnValueOnce([])

    const options: AnalyzeOptions = {
      path: process.cwd()
    }

    await expect(analyzeCommand(options)).rejects.toThrow('process.exit called')
    expect(mockConsoleError).toHaveBeenCalledWith('No source files found')
  })

  it('should perform split analysis', async () => {
    const { performSplitAnalysis } = await import('@specmind/core')

    const options: AnalyzeOptions = {
      path: process.cwd()
    }

    await analyzeCommand(options)

    // Verify split analysis was called
    expect(performSplitAnalysis).toHaveBeenCalled()
  })
})
