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
    functions: [],
    classes: [],
    imports: [],
    exports: [],
    calls: []
  }),
  buildDependencyGraph: vi.fn().mockReturnValue([]),
  generateComponentDiagram: vi.fn().mockReturnValue('graph TD\n  A[Component A]')
}))

// Mock fs
vi.mock('fs', () => ({
  readdirSync: vi.fn().mockReturnValue(['file.ts']),
  statSync: vi.fn().mockReturnValue({
    isDirectory: () => false,
    isFile: () => true
  }),
  existsSync: vi.fn().mockReturnValue(false), // No .gitignore by default
  readFileSync: vi.fn().mockReturnValue('')
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
      path: process.cwd(),
      format: 'json'
    }

    await analyzeCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should analyze with custom path', async () => {
    const options: AnalyzeOptions = {
      path: '/custom/path',
      format: 'json'
    }

    await analyzeCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should analyze with pretty format', async () => {
    const options: AnalyzeOptions = {
      path: process.cwd(),
      format: 'pretty'
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
      path: process.cwd(),
      format: 'json'
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
      path: process.cwd(),
      format: 'json'
    }

    await expect(analyzeCommand(options)).rejects.toThrow('process.exit called')
    expect(mockConsoleError).toHaveBeenCalledWith('No source files found')
  })
})
