#!/usr/bin/env node

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync } from 'fs'
import { join, dirname, extname } from 'path'
import { fileURLToPath } from 'url'

/**
 * Setup command - copies assistant files to user's project
 * Inlines shared prompt templates into command files
 *
 * Usage:
 *   specmind setup claude-code
 *   specmind setup cursor
 *   specmind setup              # Interactive mode
 */

const ASSISTANT_CONFIGS = {
  'claude-code': {
    source: '.claude',
    dest: '.claude',
    description: 'Claude Code slash commands'
  },
  cursor: {
    source: '.cursorrules',
    dest: '.cursorrules',
    description: 'Cursor rules and commands'
  },
  windsurf: {
    source: 'cascade',
    dest: '.cascade',
    description: 'Windsurf Cascade commands'
  },
  copilot: {
    source: 'instructions',
    dest: '.github/copilot',
    description: 'GitHub Copilot instructions'
  }
} as const

type AssistantName = keyof typeof ASSISTANT_CONFIGS

export interface SetupOptions {
  assistants?: AssistantName[]
}

function getAssistantsDir(): string {
  // Get the directory of this file
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)

  // Navigate to the assistants directory in the monorepo
  // cli/dist/commands/setup.js -> ../../assistants
  return join(__dirname, '..', '..', '..', '..', 'assistants')
}

/**
 * Recursively process files in a directory, inlining prompt references
 */
function processDirectory(sourceDir: string, destDir: string, promptsDir: string) {
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true })
  }

  const entries = readdirSync(sourceDir)

  for (const entry of entries) {
    const sourcePath = join(sourceDir, entry)
    const destPath = join(destDir, entry)
    const stat = statSync(sourcePath)

    if (stat.isDirectory()) {
      processDirectory(sourcePath, destPath, promptsDir)
    } else if (stat.isFile()) {
      processFile(sourcePath, destPath, promptsDir)
    }
  }
}

/**
 * Process a single file, inlining {{file:...}} references
 */
function processFile(sourcePath: string, destPath: string, promptsDir: string) {
  const ext = extname(sourcePath)

  // Only process markdown files for inlining
  if (ext !== '.md') {
    cpSync(sourcePath, destPath)
    return
  }

  let content = readFileSync(sourcePath, 'utf-8')

  // Replace {{file:../_shared/...}} references
  const fileRefPattern = /\{\{file:\.\.\/\_shared\/([^}]+)\}\}/g
  content = content.replace(fileRefPattern, (match, filename) => {
    const promptPath = join(promptsDir, filename)

    if (!existsSync(promptPath)) {
      console.warn(`⚠️  Warning: Prompt file not found: ${promptPath}`)
      return match // Keep original if file not found
    }

    const promptContent = readFileSync(promptPath, 'utf-8')
    return promptContent
  })

  writeFileSync(destPath, content, 'utf-8')
}

export async function setupCommand(options: SetupOptions = {}) {
  try {
    const assistants = options.assistants || []

    if (assistants.length === 0) {
      console.log('Usage: specmind setup <assistant>')
      console.log('\nAvailable assistants:')
      for (const [name, config] of Object.entries(ASSISTANT_CONFIGS)) {
        console.log(`  ${name.padEnd(15)} - ${config.description}`)
      }
      return
    }

    const assistantsDir = getAssistantsDir()
    const promptsDir = join(assistantsDir, '_shared')

    for (const assistant of assistants) {
      if (!(assistant in ASSISTANT_CONFIGS)) {
        console.error(`❌ Unknown assistant: ${assistant}`)
        continue
      }

      const config = ASSISTANT_CONFIGS[assistant]
      const sourcePath = join(assistantsDir, assistant, config.source)
      const destPath = join(process.cwd(), config.dest)

      if (!existsSync(sourcePath)) {
        console.error(`❌ Source not found: ${sourcePath}`)
        console.error(`   (Assistant not yet implemented)`)
        continue
      }

      // Process assistant files, inlining prompt references
      processDirectory(sourcePath, destPath, promptsDir)
      console.log(`✅ Copied ${config.description} to ${config.dest}`)
    }

    console.log('\n🎉 Setup complete! You can now use SpecMind slash commands.')
  } catch (error) {
    console.error('Error during setup:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
