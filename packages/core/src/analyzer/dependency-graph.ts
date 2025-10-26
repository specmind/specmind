import { resolve, dirname } from 'path'
import type { FileAnalysis, ModuleDependency } from '../types/index.js'
import { getLanguageConfig } from './language-config.js'

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

      // Resolve relative import to absolute path using language-specific resolution
      const fileDir = dirname(file.filePath)
      const resolvedPath = resolveImportPath(fileDir, importSource, file.language, filePaths)

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
 * Uses language-specific module resolution configuration
 */
function resolveImportPath(
  fromDir: string,
  importPath: string,
  language: 'typescript' | 'javascript' | 'python',
  existingFiles: Set<string>
): string | null {
  const config = getLanguageConfig(language)
  const { extensions, indexFiles } = config.moduleResolution

  // Remove any extension that matches the language's extensions
  let cleanPath = importPath
  for (const ext of extensions) {
    if (cleanPath.endsWith(ext)) {
      cleanPath = cleanPath.slice(0, -ext.length)
      break
    }
  }

  // Try different extensions
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

  // Try index files for directory imports
  for (const indexFile of indexFiles) {
    const indexPath = resolve(fromDir, cleanPath, indexFile)
    if (existingFiles.has(indexPath)) {
      return indexPath
    }
  }

  // If we can't resolve it, return null (might be a package or missing file)
  return null
}

/**
 * Find entry points (files that are not imported by anyone)
 */
export function findEntryPoints(
  files: FileAnalysis[],
  dependencies: ModuleDependency[]
): string[] {
  // Build set of all imported file paths (targets)
  const importedFiles = new Set<string>()
  for (const dep of dependencies) {
    importedFiles.add(dep.target)
  }

  const entryPoints: string[] = []
  for (const file of files) {
    if (!importedFiles.has(file.filePath)) {
      entryPoints.push(file.filePath)
    }
  }

  return entryPoints
}
