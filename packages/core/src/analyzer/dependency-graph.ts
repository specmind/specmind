import { resolve, dirname } from 'path'
import type { FileAnalysis, ModuleDependency } from '../types/index.js'

/**
 * Build module dependency graph from file analyses
 * Resolves relative import paths to absolute file paths
 */
export function buildDependencyGraph(files: FileAnalysis[]): ModuleDependency[] {
  const dependencies: ModuleDependency[] = []

  // Create a map of file paths for quick lookup
  const filePaths = new Set(files.map(f => f.filePath))

  for (const file of files) {
    for (const importStmt of file.imports) {
      const importSource = importStmt.source

      // Skip external packages (not relative paths)
      if (!importSource.startsWith('.')) {
        continue
      }

      // Resolve relative import to absolute path
      const fileDir = dirname(file.filePath)
      const resolvedPath = resolveImportPath(fileDir, importSource, filePaths)

      if (resolvedPath) {
        dependencies.push({
          source: file.filePath,
          target: resolvedPath,
          importedNames: importStmt.imports.map((imp) => imp.name),
        })
      }
    }
  }

  return dependencies
}

/**
 * Resolve a relative import path to an absolute file path
 * Handles .js, .ts, .tsx extensions and index files
 */
function resolveImportPath(
  fromDir: string,
  importPath: string,
  existingFiles: Set<string>
): string | null {
  // Remove .js extension if present (TS files import with .js for ESM)
  let cleanPath = importPath
  if (cleanPath.endsWith('.js')) {
    cleanPath = cleanPath.slice(0, -3)
  } else if (cleanPath.endsWith('.jsx')) {
    cleanPath = cleanPath.slice(0, -4)
  }

  // Try different extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mts', '.cts']

  for (const ext of extensions) {
    const candidatePath = resolve(fromDir, cleanPath + ext)
    if (existingFiles.has(candidatePath)) {
      return candidatePath
    }
  }

  // Try as-is (might already have extension)
  const asIsPath = resolve(fromDir, importPath)
  if (existingFiles.has(asIsPath)) {
    return asIsPath
  }

  // Try index files
  for (const ext of extensions) {
    const indexPath = resolve(fromDir, cleanPath, `index${ext}`)
    if (existingFiles.has(indexPath)) {
      return indexPath
    }
  }

  // If we can't resolve it, return null (might be a package or missing file)
  return null
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
