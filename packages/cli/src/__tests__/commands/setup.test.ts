import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setupCommand } from '../../commands/setup.js'
import type { SetupOptions } from '../../commands/setup.js'

// Mock process.exit
const mockExit = vi.spyOn(process, 'exit').mockImplementation((code?: string | number | null | undefined) => {
  throw new Error(`process.exit called with code ${code}`)
})

// Mock fs operations
vi.mock('fs', () => ({
  cpSync: vi.fn(),
  existsSync: vi.fn().mockReturnValue(true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn().mockReturnValue(['commands']),
  readFileSync: vi.fn().mockReturnValue('# Test prompt\nContent here'),
  writeFileSync: vi.fn(),
  statSync: vi.fn().mockReturnValue({
    isFile: () => true,
    isDirectory: () => false
  })
}))

// Mock console
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
const mockConsoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {})

describe('setupCommand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should setup claude-code assistant', async () => {
    const options: SetupOptions = {
      assistants: ['claude-code']
    }

    await setupCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should setup multiple assistants', async () => {
    const options: SetupOptions = {
      assistants: ['claude-code', 'cursor']
    }

    await setupCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should handle no assistants specified', async () => {
    const options: SetupOptions = {
      assistants: []
    }

    await setupCommand(options)

    expect(mockConsoleLog).toHaveBeenCalled()
  })

  it('should handle errors gracefully', async () => {
    const fs = await import('fs')
    vi.mocked(fs.readdirSync).mockImplementationOnce(() => {
      throw new Error('Permission denied')
    })

    const options: SetupOptions = {
      assistants: ['claude-code']
    }

    try {
      await setupCommand(options)
    } catch (error) {
      // Expect process.exit to be called
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).toContain('process.exit called')
    }

    expect(mockConsoleError).toHaveBeenCalled()
  })

  it('should handle unknown assistant', async () => {
    const options: SetupOptions = {
      assistants: ['unknown-assistant' as any]
    }

    await setupCommand(options)

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Unknown assistant'))
  })

  it('should warn about missing source directory', async () => {
    const fs = await import('fs')
    vi.mocked(fs.existsSync).mockReturnValueOnce(false) // assistantsDir check
      .mockReturnValueOnce(false) // sourcePath check

    const options: SetupOptions = {
      assistants: ['cursor']
    }

    await setupCommand(options)

    expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Source not found'))
  })
})
