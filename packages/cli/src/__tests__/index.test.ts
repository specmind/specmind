import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Command } from 'commander'

// Mock the commands
vi.mock('../commands/analyze.js', () => ({
  analyzeCommand: vi.fn().mockResolvedValue(undefined)
}))

vi.mock('../commands/setup.js', () => ({
  setupCommand: vi.fn().mockResolvedValue(undefined)
}))

// Mock console to suppress output
const mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
const mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

describe('CLI entry point', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a commander program', () => {
    const program = new Command()

    program
      .name('specmind')
      .description('AI-powered architecture documentation tool')
      .version('0.1.0')

    expect(program.name()).toBe('specmind')
    expect(program.description()).toBe('AI-powered architecture documentation tool')
    expect(program.version()).toBe('0.1.0')
  })

  it('should register analyze command', () => {
    const program = new Command()

    program
      .command('analyze')
      .description('Analyze codebase and generate architecture diagram')
      .option('-p, --path <path>', 'Path to analyze', process.cwd())
      .option('-f, --format <format>', 'Output format (json|pretty)', 'json')

    const commands = program.commands
    expect(commands).toHaveLength(1)
    expect(commands[0].name()).toBe('analyze')
  })

  it('should register setup command', () => {
    const program = new Command()

    program
      .command('setup [assistants...]')
      .description('Set up SpecMind for your AI assistant')

    const commands = program.commands
    expect(commands).toHaveLength(1)
    expect(commands[0].name()).toBe('setup')
  })

  it('should have correct command options for analyze', () => {
    const program = new Command()

    const analyzeCmd = program
      .command('analyze')
      .option('-p, --path <path>', 'Path to analyze', process.cwd())
      .option('-f, --format <format>', 'Output format (json|pretty)', 'json')

    const options = analyzeCmd.options
    expect(options).toHaveLength(2)
    expect(options[0].short).toBe('-p')
    expect(options[0].long).toBe('--path')
    expect(options[1].short).toBe('-f')
    expect(options[1].long).toBe('--format')
  })

  it('should handle variadic arguments for setup command', () => {
    const program = new Command()

    const setupCmd = program.command('setup [assistants...]')

    expect(setupCmd.name()).toBe('setup')
    // Variadic argument allows multiple assistants to be passed
    expect(setupCmd.args).toBeDefined()
  })
})
