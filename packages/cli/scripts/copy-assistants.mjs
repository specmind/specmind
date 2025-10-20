#!/usr/bin/env node

/**
 * Copy assistants folder from monorepo root to CLI package
 * This runs before build to ensure assistants are bundled with the package
 */

import { cpSync, existsSync, rmSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// CLI package root (scripts/copy-assistants.mjs -> ..)
const cliRoot = join(__dirname, '..')

// Monorepo root (packages/cli -> ../..)
const monorepoRoot = join(cliRoot, '..', '..')

const sourceDir = join(monorepoRoot, 'assistants')
const destDir = join(cliRoot, 'assistants')

console.log('📦 Copying assistants folder to CLI package...')
console.log(`   Source: ${sourceDir}`)
console.log(`   Dest:   ${destDir}`)

// Remove existing assistants folder if it exists
if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true })
}

// Copy assistants folder
if (!existsSync(sourceDir)) {
  console.error(`❌ Source directory not found: ${sourceDir}`)
  process.exit(1)
}

cpSync(sourceDir, destDir, { recursive: true })
console.log('✅ Assistants folder copied successfully')
