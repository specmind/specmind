#!/usr/bin/env node

/**
 * Validation script for .sm file test fixtures
 *
 * Purpose: End-to-end validation of real .sm files with the format package
 * Different from unit tests - this validates complete, realistic .sm files
 *
 * Usage:
 *   pnpm validate-fixtures
 *   node test-fixtures/validate-fixtures.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { tryParseSmFile, validateSmFile } from '../dist/index.js'

// Get directory of this script
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const FIXTURES_DIR = join(__dirname, '.specmind')
const GREEN = '\x1b[32m'
const RED = '\x1b[31m'
const YELLOW = '\x1b[33m'
const RESET = '\x1b[0m'

function log(color, symbol, message) {
  console.log(`${color}${symbol}${RESET} ${message}`)
}

function success(message) {
  log(GREEN, '✅', message)
}
function error(message) {
  log(RED, '❌', message)
}
function info(message) {
  console.log(`ℹ️  ${message}`)
}

async function validateFile(filePath) {
  const relativePath = filePath.replace(process.cwd() + '/', '')

  if (!existsSync(filePath)) {
    error(`File not found: ${relativePath}`)
    return false
  }

  try {
    // Read file
    const content = readFileSync(filePath, 'utf8')
    info(`Validating ${relativePath} (${content.length} chars)`)

    // Validate
    const validation = validateSmFile(content)
    if (!validation.valid) {
      error(`Validation failed: ${validation.error}`)
      return false
    }

    success(`Validation passed`)

    // Parse
    const parseResult = tryParseSmFile(content)
    if (!parseResult.success) {
      error(`Parse failed: ${parseResult.error}`)
      return false
    }

    const smFile = parseResult.data
    success(`Parsed successfully`)
    console.log(`   Content: ${smFile.content.length} chars`)
    console.log(`   Diagrams: ${smFile.diagrams.length}`)

    return true
  } catch (err) {
    error(`Validation error: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('🧪 SpecMind .sm File Fixture Validation\n')

  const files = [
    join(FIXTURES_DIR, 'features/user-authentication.sm'),
    join(FIXTURES_DIR, 'system.sm')
  ]

  let allPassed = true

  for (const path of files) {
    const passed = await validateFile(resolve(path))
    allPassed = allPassed && passed
    console.log()
  }

  // Summary
  if (allPassed) {
    success('All validations passed! 🎉')
    process.exit(0)
  } else {
    error('Some validations failed! 💥')
    process.exit(1)
  }
}

main().catch(err => {
  error(`Script error: ${err.message}`)
  process.exit(1)
})
