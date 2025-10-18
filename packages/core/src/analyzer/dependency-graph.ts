import type { FileAnalysis, ModuleDependency } from '../types/index.js'

/**
 * Build module dependency graph from file analyses
 */
export function buildDependencyGraph(files: FileAnalysis[]): ModuleDependency[] {
  const dependencies: ModuleDependency[] = []

  for (const file of files) {
    for (const importStmt of file.imports) {
      dependencies.push({
        source: file.filePath,
        target: importStmt.source,
        importedNames: importStmt.imports.map((imp) => imp.name),
      })
    }
  }

  return dependencies
}

/**
 * Normalize import path to match file path
 * './types' -> 'types.ts', './utils' -> 'utils.ts', etc.
 */
function normalizeImportPath(importPath: string): string[] {
  // Remove leading ./ or ../
  const cleaned = importPath.replace(/^\.\//, '').replace(/^\.\.\//, '')

  // Return possible file variations (could be .ts, .tsx, .js, .jsx)
  return [
    `${cleaned}.ts`,
    `${cleaned}.tsx`,
    `${cleaned}.js`,
    `${cleaned}.jsx`,
    cleaned, // Already has extension
  ]
}

/**
 * Find entry points (files that are not imported by anyone)
 */
export function findEntryPoints(
  files: FileAnalysis[],
  dependencies: ModuleDependency[]
): string[] {
  // Build set of all possible imported file names
  const importedFiles = new Set<string>()
  for (const dep of dependencies) {
    const possiblePaths = normalizeImportPath(dep.target)
    possiblePaths.forEach((path) => importedFiles.add(path))
  }

  const allFiles = new Set(files.map((file) => file.filePath))
  const entryPoints: string[] = []

  for (const file of allFiles) {
    if (!importedFiles.has(file)) {
      entryPoints.push(file)
    }
  }

  return entryPoints
}
