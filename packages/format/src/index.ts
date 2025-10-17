/**
 * @specmind/format
 *
 * .sm file format parser and writer for SpecMind
 *
 * This package provides:
 * - Zod schemas for .sm file validation
 * - Parser for reading .sm files from markdown
 * - Writer for generating .sm files to markdown
 * - Utilities for feature naming and file paths
 */

// Schemas
export {
  SmFileSchema,
  RawSmFileSchema,
  FeatureNameSchema,
  type SmFile,
  type RawSmFile,
  type FeatureName
} from './schemas.js'

// Parser
export {
  parseSmFile,
  type ParseResult
} from './parser.js'

// Writer
export {
  writeSmFile,
  writeSmFileWithMetadata,
  validateSmFileForWriting,
  type WriteResult
} from './writer.js'

// Utilities
export {
  slugify,
  createFeatureName,
  isValidSlug,
  extractSlugFromFilename,
  getFeatureFilePath,
  getSystemFilePath
} from './utils.js'