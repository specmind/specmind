#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs'
import { join, relative } from 'path'
import ignore from 'ignore'
import {
  analyzeFile,
  buildDependencyGraph,
  generateComponentDiagram,
  detectLanguage,
} from '@specmind/core'
import type { FileAnalysis } from '@specmind/core'

/**
 * Analyze command - analyzes codebase and outputs architecture data
 *
 * Usage:
 *   specmind analyze --format json
 *   specmind analyze --path ./src
 */

export interface AnalyzeOptions {
  path?: string
  format?: 'json' | 'pretty'
  output?: string // File path to save output
}

/**
 * Find all .gitignore files from startDir up to root
 * Returns array of {path, dir} objects, ordered from root to startDir
 */
function findAllGitignores(startDir: string): Array<{ path: string; dir: string }> {
  const gitignores: Array<{ path: string; dir: string }> = []
  let currentDir = startDir

  while (true) {
    const gitignorePath = join(currentDir, '.gitignore')
    if (existsSync(gitignorePath)) {
      gitignores.unshift({ path: gitignorePath, dir: currentDir })
    }

    const parentDir = join(currentDir, '..')
    // Reached root directory
    if (parentDir === currentDir) {
      break
    }
    currentDir = parentDir
  }

  return gitignores
}

/**
 * Load ignore patterns from .gitignore and .specmindignore files
 * Returns ignore instance and the root directory (where topmost .gitignore is)
 */
function loadIgnorePatterns(baseDir: string): { ig: ReturnType<typeof ignore>; rootDir: string } {
  const ig = ignore()

  // Find all .gitignore files in parent hierarchy
  const gitignores = findAllGitignores(baseDir)
  const rootDir = gitignores.length > 0 && gitignores[0] ? gitignores[0].dir : baseDir

  // Load all .gitignore files (from root down to baseDir)
  for (const { path: gitignorePath } of gitignores) {
    const content = readFileSync(gitignorePath, 'utf8')
    ig.add(content)
  }

  // Load .specmindignore (tool-specific ignore rules, only from baseDir)
  const specmindignorePath = join(baseDir, '.specmindignore')
  if (existsSync(specmindignorePath)) {
    const content = readFileSync(specmindignorePath, 'utf8')
    ig.add(content)
  }

  // Always ignore .git directory (never analyze git internals)
  ig.add('.git')

  return { ig, rootDir }
}

function getAllFiles(dir: string): string[] {
  const files: string[] = []
  const { ig, rootDir } = loadIgnorePatterns(dir)

  function traverse(currentPath: string) {
    try {
      const entries = readdirSync(currentPath)

      for (const entry of entries) {
        const fullPath = join(currentPath, entry)
        // Calculate path relative to the root where .gitignore is located
        const relativePath = relative(rootDir, fullPath)
        const stat = statSync(fullPath)

        // Check if path should be ignored
        // For directories, add trailing slash for proper gitignore matching
        const pathToCheck = stat.isDirectory() ? relativePath + '/' : relativePath
        if (ig.ignores(pathToCheck)) {
          continue
        }

        if (stat.isDirectory()) {
          traverse(fullPath)
        } else if (stat.isFile()) {
          // Use detectLanguage to check if file is supported
          if (detectLanguage(fullPath)) {
            files.push(fullPath)
          }
        }
      }
    } catch (error) {
      // Skip directories we can't read
    }
  }

  traverse(dir)
  return files
}

export async function analyzeCommand(options: AnalyzeOptions = {}) {
  try {
    const targetPath = options.path || process.cwd()
    const format = options.format || 'json'

    // Find all source files
    const files = getAllFiles(targetPath)

    if (files.length === 0) {
      console.error('No source files found')
      process.exit(1)
    }

    // Analyze each file
    const analyses: FileAnalysis[] = []
    for (const file of files) {
      try {
        const analysis = await analyzeFile(file)
        if (analysis) {
          analyses.push(analysis)
        }
      } catch (error) {
        // Skip files that fail to analyze
      }
    }

    // Build dependency graph
    const graph = buildDependencyGraph(analyses)

    // Generate diagram
    const diagram = generateComponentDiagram(analyses)

    // Prepare output
    const components = analyses.map(a => ({
      file: relative(targetPath, a.filePath),
      language: a.language,
      functions: a.functions.length,
      classes: a.classes.length,
      imports: a.imports.length,
      exports: a.exports.length
    }))

    const relationships = graph.map(dep => ({
      source: relative(targetPath, dep.source),
      target: relative(targetPath, dep.target),
      importedNames: dep.importedNames
    }))

    const metadata = {
      filesAnalyzed: files.length,
      totalFunctions: analyses.reduce((sum, a) => sum + a.functions.length, 0),
      totalClasses: analyses.reduce((sum, a) => sum + a.classes.length, 0),
      languages: [...new Set(analyses.map(a => a.language))]
    }

    // Prepare output content
    let outputContent: string
    if (format === 'json') {
      // JSON output for LLM consumption
      const output = {
        diagram,
        components,
        relationships,
        metadata
      }
      outputContent = JSON.stringify(output, null, 2)
    } else {
      // Pretty output for humans
      outputContent = `=== Codebase Analysis ===\n
Files analyzed: ${metadata.filesAnalyzed}
Functions: ${metadata.totalFunctions}
Classes: ${metadata.totalClasses}
Languages: ${metadata.languages.join(', ')}

Diagram:
${diagram}`
    }

    // Write to file or console
    if (options.output) {
      writeFileSync(options.output, outputContent, 'utf8')
      console.log(`Analysis saved to: ${options.output}`)
    } else {
      console.log(outputContent)
    }
  } catch (error) {
    console.error('Error analyzing codebase:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
