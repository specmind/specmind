#!/usr/bin/env node

import { readdirSync, statSync } from 'fs'
import { join, relative } from 'path'
import { analyzeFile, buildDependencyGraph, generateComponentDiagram } from '@specmind/core'
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
}

function getAllFiles(dir: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = []

  function traverse(currentPath: string) {
    try {
      const entries = readdirSync(currentPath)

      for (const entry of entries) {
        const fullPath = join(currentPath, entry)
        const stat = statSync(fullPath)

        if (stat.isDirectory()) {
          // Skip node_modules, dist, build, etc.
          if (!['node_modules', 'dist', 'build', '.git', 'coverage'].includes(entry)) {
            traverse(fullPath)
          }
        } else if (stat.isFile()) {
          if (extensions.some(ext => fullPath.endsWith(ext))) {
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

    // Output based on format
    if (format === 'json') {
      // JSON output for LLM consumption
      const output = {
        diagram,
        components,
        relationships,
        metadata
      }
      console.log(JSON.stringify(output, null, 2))
    } else {
      // Pretty output for humans
      console.log('=== Codebase Analysis ===\n')
      console.log(`Files analyzed: ${metadata.filesAnalyzed}`)
      console.log(`Functions: ${metadata.totalFunctions}`)
      console.log(`Classes: ${metadata.totalClasses}`)
      console.log(`Languages: ${metadata.languages.join(', ')}`)
      console.log(`\nDiagram:\n${diagram}`)
    }
  } catch (error) {
    console.error('Error analyzing codebase:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}
