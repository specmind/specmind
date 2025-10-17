import { FeatureName, FeatureNameSchema } from './schemas.js'

/**
 * Slugifies a feature name according to CONSTITUTION.md Section 4.2
 *
 * Rules:
 * 1. Convert to lowercase
 * 2. Replace spaces and special characters with hyphens (-)
 * 3. Remove leading/trailing hyphens
 * 4. Use descriptive, meaningful names
 * 5. No timestamps in filename
 *
 * @param name Original feature name
 * @returns Slugified name suitable for filename
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

/**
 * Creates a FeatureName object from a user-provided name
 *
 * @param originalName Feature name as provided by user
 * @returns Validated FeatureName object
 */
export function createFeatureName(originalName: string): FeatureName {
  const slug = slugify(originalName)
  const filename = `${slug}.sm`

  const featureName = {
    original: originalName,
    slug,
    filename
  }

  return FeatureNameSchema.parse(featureName)
}

/**
 * Validates if a string is a valid feature slug
 *
 * @param slug String to validate
 * @returns True if valid kebab-case slug
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)
}

/**
 * Extracts feature name from .sm filename
 *
 * @param filename .sm filename
 * @returns Feature slug or null if invalid
 */
export function extractSlugFromFilename(filename: string): string | null {
  if (!filename.endsWith('.sm')) {
    return null
  }

  const slug = filename.slice(0, -3) // Remove .sm extension
  return isValidSlug(slug) ? slug : null
}

/**
 * Gets the file path for a feature .sm file
 *
 * @param slug Feature slug
 * @returns Relative path from project root
 */
export function getFeatureFilePath(slug: string): string {
  return `.specmind/features/${slug}.sm`
}

/**
 * Gets the file path for system.sm
 *
 * @returns Relative path from project root
 */
export function getSystemFilePath(): string {
  return '.specmind/system.sm'
}