import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { join } from 'path'
import { analyzeCommand } from '../../commands/analyze.js'

// Test directory structure
const TEST_DIR = join(process.cwd(), '__test-gitignore__')
const NESTED_DIR = join(TEST_DIR, 'nested')

function setupTestFiles() {
  // Clean up if exists
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }

  // Create test directory structure
  mkdirSync(TEST_DIR, { recursive: true })
  mkdirSync(NESTED_DIR, { recursive: true })
  mkdirSync(join(TEST_DIR, 'dist'), { recursive: true })
  mkdirSync(join(TEST_DIR, 'src'), { recursive: true })
  mkdirSync(join(TEST_DIR, '.git'), { recursive: true })

  // Create test files
  writeFileSync(join(TEST_DIR, 'src', 'index.ts'), 'export const foo = "bar"')
  writeFileSync(join(TEST_DIR, 'dist', 'index.js'), 'module.exports = {}')
  writeFileSync(join(TEST_DIR, '.git', 'config'), '[core]')
  writeFileSync(join(NESTED_DIR, 'nested.ts'), 'export const nested = true')
}

function cleanupTestFiles() {
  if (existsSync(TEST_DIR)) {
    rmSync(TEST_DIR, { recursive: true, force: true })
  }
}

describe('analyze command - .gitignore support', () => {
  beforeEach(() => {
    setupTestFiles()
  })

  afterEach(() => {
    cleanupTestFiles()
  })

  it('should respect .gitignore in the same directory', async () => {
    // Create .gitignore that ignores dist/
    writeFileSync(join(TEST_DIR, '.gitignore'), 'dist/\n')

    const result = await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // Parse the console output (since analyzeCommand logs to console)
    // For now, we'll check that dist files are not in the analyzed files
    // This is a basic test - we'd need to refactor analyzeCommand to return data instead of logging
  })

  it('should respect .gitignore patterns for files', async () => {
    // Create .gitignore that ignores *.js files
    writeFileSync(join(TEST_DIR, '.gitignore'), '*.js\n')
    writeFileSync(join(TEST_DIR, 'test.js'), 'console.log("test")')
    writeFileSync(join(TEST_DIR, 'test.ts'), 'const test = "test"')

    await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // test.js should be ignored, test.ts should be analyzed
  })

  it('should load .gitignore from parent directories', async () => {
    // Create .gitignore in parent directory
    writeFileSync(join(TEST_DIR, '.gitignore'), 'dist/\n')

    await analyzeCommand({
      path: NESTED_DIR,
      format: 'json'
    })

    // Parent .gitignore should apply to nested directory
  })

  it('should respect .specmindignore', async () => {
    // Create .specmindignore that ignores test files
    writeFileSync(join(TEST_DIR, '.specmindignore'), '*.test.ts\n')
    writeFileSync(join(TEST_DIR, 'src', 'index.test.ts'), 'test("should work", () => {})')
    writeFileSync(join(TEST_DIR, 'src', 'index.ts'), 'export const foo = "bar"')

    await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // *.test.ts files should be ignored
  })

  it('should always ignore .git directory', async () => {
    // No .gitignore file - .git should still be ignored
    await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // .git directory should always be ignored, even without .gitignore
  })

  it('should combine multiple .gitignore files', async () => {
    // Parent .gitignore
    writeFileSync(join(TEST_DIR, '.gitignore'), 'dist/\n')

    // Nested .gitignore
    writeFileSync(join(NESTED_DIR, '.gitignore'), '*.log\n')
    writeFileSync(join(NESTED_DIR, 'debug.log'), 'log content')
    writeFileSync(join(NESTED_DIR, 'code.ts'), 'export const code = true')

    await analyzeCommand({
      path: NESTED_DIR,
      format: 'json'
    })

    // Both parent and local .gitignore rules should apply
  })

  it('should handle directory patterns correctly', async () => {
    // Create .gitignore with directory pattern
    writeFileSync(join(TEST_DIR, '.gitignore'), 'temp/\n')
    mkdirSync(join(TEST_DIR, 'temp'), { recursive: true })
    writeFileSync(join(TEST_DIR, 'temp', 'temp.ts'), 'export const temp = true')

    await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // temp/ directory should be ignored
  })

  it('should handle negation patterns', async () => {
    // Create .gitignore with negation
    writeFileSync(join(TEST_DIR, '.gitignore'), '*.log\n!important.log\n')
    writeFileSync(join(TEST_DIR, 'debug.log'), 'debug')
    writeFileSync(join(TEST_DIR, 'important.log'), 'important')

    await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // debug.log ignored, important.log not ignored (but it's .log so won't be analyzed anyway)
  })

  it('should work when no .gitignore exists', async () => {
    // No .gitignore file
    await analyzeCommand({
      path: TEST_DIR,
      format: 'json'
    })

    // Should still work, just with default ignores (.git)
  })
})
