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
import { parseSmFile, writeSmFile, validateSmFileForWriting } from '../dist/index.js'

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

function success(message) { log(GREEN, '✅', message) }
function error(message) { log(RED, '❌', message) }
function warning(message) { log(YELLOW, '⚠️', message) }
function info(message) { console.log(`ℹ️  ${message}`) }

async function validateFile(filePath, type = 'feature') {
  const relativePath = filePath.replace(process.cwd() + '/', '')

  if (!existsSync(filePath)) {
    error(`File not found: ${relativePath}`)
    return false
  }

  try {
    // Read file
    const content = readFileSync(filePath, 'utf8')
    info(`Validating ${relativePath} (${content.length} chars)`)

    // Parse
    const parseResult = parseSmFile(content, type)
    if (!parseResult.success) {
      error(`Parse failed: ${parseResult.error}`)
      return false
    }

    const smFile = parseResult.data
    success(`Parsed successfully`)
    console.log(`   Name: "${smFile.name}"`)
    console.log(`   Type: ${smFile.type}`)
    console.log(`   Requirements: ${smFile.requirements.length}`)
    console.log(`   Integration Points: ${smFile.integrationPoints.length}`)
    console.log(`   Architecture: ${smFile.architecture.length} chars`)

    // Validate for writing
    const validation = validateSmFileForWriting(smFile)
    if (!validation.valid) {
      warning(`Writing validation issues:`)
      validation.issues.forEach(issue => console.log(`     - ${issue}`))
    } else {
      success(`Writing validation passed`)
    }

    // Test roundtrip
    const writeResult = writeSmFile(smFile)
    if (!writeResult.success) {
      error(`Write failed: ${writeResult.error}`)
      return false
    }

    success(`Write successful (${writeResult.content.length} chars)`)

    // Compare lengths (rough roundtrip check)
    const sizeDiff = Math.abs(content.length - writeResult.content.length)
    if (sizeDiff > 50) { // Allow some whitespace differences
      warning(`Size difference: ${sizeDiff} chars (original: ${content.length}, generated: ${writeResult.content.length})`)
    } else {
      success(`Roundtrip size check passed`)
    }

    return true

  } catch (err) {
    error(`Validation error: ${err.message}`)
    return false
  }
}

async function main() {
  console.log('🧪 SpecMind .sm File Fixture Validation\n')

  const files = [
    { path: join(FIXTURES_DIR, 'features/user-authentication.sm'), type: 'feature' },
    { path: join(FIXTURES_DIR, 'system.sm'), type: 'system' }
  ]

  let allPassed = true

  for (const { path, type } of files) {
    const passed = await validateFile(resolve(path), type)
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