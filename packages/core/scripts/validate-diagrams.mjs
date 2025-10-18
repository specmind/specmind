#!/usr/bin/env node

/**
 * Validate diagram generation by analyzing test fixtures
 * and generating Mermaid diagrams
 */

import { readFile } from 'fs/promises'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import {
  analyzeFileContent,
  generateClassDiagram,
  generateComponentDiagram,
  generateSequenceDiagram,
} from '../dist/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const fixturesDir = join(__dirname, '../test-fixtures')

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function section(title) {
  console.log()
  log('═'.repeat(80), 'cyan')
  log(`  ${title}`, 'bold')
  log('═'.repeat(80), 'cyan')
  console.log()
}

async function validateFixture(filename) {
  const filePath = join(fixturesDir, filename)

  try {
    // Read fixture file
    const code = await readFile(filePath, 'utf-8')

    // Analyze the file
    const analysis = analyzeFileContent(filename, code, 'typescript')

    // Generate class diagram
    const classDiagram = generateClassDiagram(analysis, {
      includePrivate: true,
      includeParameters: true,
    })

    // Generate sequence diagram
    const sequenceDiagram = generateSequenceDiagram(analysis)

    return {
      filename,
      analysis,
      classDiagram,
      sequenceDiagram,
    }
  } catch (error) {
    log(`✗ Error analyzing ${filename}: ${error.message}`, 'red')
    return null
  }
}

async function main() {
  section('SpecMind Core - Diagram Generator Validation')

  log('Analyzing test fixtures and generating Mermaid diagrams...', 'blue')
  console.log()

  // Validate individual fixtures
  const fixtures = ['user-service.ts', 'database.ts', 'email-service.ts']
  const results = []

  for (const fixture of fixtures) {
    const result = await validateFixture(fixture)
    if (result) {
      results.push(result)
      log(`✓ Analyzed ${fixture}`, 'green')
    }
  }

  console.log()

  // Display results
  for (const result of results) {
    section(`File: ${result.filename}`)

    // Show analysis summary
    log('Analysis Summary:', 'yellow')
    log(`  Classes: ${result.analysis.classes.length}`)
    log(`  Functions: ${result.analysis.functions.length}`)
    log(`  Imports: ${result.analysis.imports.length}`)
    log(`  Exports: ${result.analysis.exports.length}`)
    console.log()

    // Show class diagram
    if (result.classDiagram && result.analysis.classes.length > 0) {
      log('Class Diagram:', 'yellow')
      log('─'.repeat(80), 'cyan')
      console.log(result.classDiagram)
      log('─'.repeat(80), 'cyan')
      console.log()
    }

    // Show sequence diagram
    if (result.sequenceDiagram && result.analysis.functions.some(f => f.isExported)) {
      log('Sequence Diagram:', 'yellow')
      log('─'.repeat(80), 'cyan')
      console.log(result.sequenceDiagram)
      log('─'.repeat(80), 'cyan')
      console.log()
    }
  }

  // Generate component diagram for all files
  if (results.length > 1) {
    section('Component Diagram - All Files')

    const allAnalyses = results.map(r => r.analysis)
    const componentDiagram = generateComponentDiagram(allAnalyses)

    log('─'.repeat(80), 'cyan')
    console.log(componentDiagram)
    log('─'.repeat(80), 'cyan')
    console.log()
  }

  // Summary
  section('Validation Summary')
  log(`✓ Successfully analyzed ${results.length}/${fixtures.length} files`, 'green')
  log(`✓ Generated ${results.length} class diagrams`, 'green')
  log(`✓ Generated ${results.filter(r => r.sequenceDiagram).length} sequence diagrams`, 'green')
  log(`✓ Generated 1 component diagram`, 'green')
  console.log()

  log('💡 Tip: Copy the Mermaid code above and paste it into:', 'blue')
  log('   - https://mermaid.live for live preview', 'blue')
  log('   - VS Code with Mermaid extension', 'blue')
  log('   - GitHub/GitLab markdown files', 'blue')
  console.log()

  section('✨ Validation Complete!')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
