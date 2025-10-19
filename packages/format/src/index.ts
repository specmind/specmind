/**
 * @specmind/format
 *
 * Simplified .sm file format utilities for SpecMind
 *
 * This package provides:
 * - Mermaid diagram extraction from markdown
 * - Simple validation (markdown + at least one diagram)
 * - Utilities for feature naming and file paths
 *
 * Based on CONSTITUTION.md Section 4.2:
 * - .sm files are flexible markdown with any structure
 * - Must contain at least one Mermaid diagram
 * - No rigid section requirements
 */

// Schemas
export { SmFileSchema, FeatureNameSchema, type SmFile, type FeatureName } from './schemas.js'

// Parser
export {
  extractMermaidDiagrams,
  validateSmFile,
  parseSmFile,
  tryParseSmFile
} from './parser.js'

// Utilities
export {
  slugify,
  createFeatureName,
  isValidSlug,
  extractSlugFromFilename,
  getFeatureFilePath,
  getSystemFilePath
} from './utils.js'
