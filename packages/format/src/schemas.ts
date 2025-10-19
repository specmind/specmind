import { z } from 'zod'

/**
 * Simplified schema for .sm file format
 *
 * Based on CONSTITUTION.md Section 4.2 (Flexible Format):
 * - Markdown with any structure/sections (customizable)
 * - Must contain at least one Mermaid diagram
 */

export const SmFileSchema = z.object({
  /** Full markdown content */
  content: z.string().min(1, 'Content cannot be empty'),

  /** Extracted Mermaid diagrams */
  diagrams: z.array(z.string()).min(1, 'Must have at least one Mermaid diagram')
})

export type SmFile = z.infer<typeof SmFileSchema>

/**
 * Schema for feature naming and slugification
 */
export const FeatureNameSchema = z.object({
  /** Original feature name as provided by user */
  original: z.string().min(1),

  /** Slugified name for filename (kebab-case) */
  slug: z.string().min(1).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Must be kebab-case'),

  /** Filename with .sm extension */
  filename: z.string().min(1).endsWith('.sm')
})

export type FeatureName = z.infer<typeof FeatureNameSchema>
