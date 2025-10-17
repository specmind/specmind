import { z } from 'zod'

/**
 * Schema for .sm file format
 *
 * Based on CONSTITUTION.md Section 4.2:
 * - Hybrid format combining markdown documentation and Mermaid diagrams
 * - Each .sm file contains: overview, requirements, architecture, design decisions, notes
 */

export const SmFileSchema = z.object({
  /** Feature or system name */
  name: z.string().min(1),

  /** Feature overview and description (markdown) */
  overview: z.string(),

  /** List of requirements */
  requirements: z.array(z.string()).default([]),

  /** Mermaid.js diagram code */
  architecture: z.string(),

  /** Design decisions and rationale (markdown) */
  designDecisions: z.string().default(''),

  /** Integration points with existing system */
  integrationPoints: z.array(z.string()).default([]),

  /** Notes, warnings, optimization tips (markdown) */
  notes: z.string().default(''),

  /** File type - system.sm vs feature files */
  type: z.enum(['system', 'feature']).default('feature'),

  /** Creation timestamp */
  createdAt: z.date().default(() => new Date()),

  /** Last update timestamp */
  updatedAt: z.date().default(() => new Date())
})

export type SmFile = z.infer<typeof SmFileSchema>

/**
 * Schema for parsed .sm file content
 * Used when reading raw .sm files that may have missing sections
 */
export const RawSmFileSchema = z.object({
  name: z.string().min(1),
  overview: z.string().optional(),
  requirements: z.array(z.string()).optional(),
  architecture: z.string().optional(),
  designDecisions: z.string().optional(),
  integrationPoints: z.array(z.string()).optional(),
  notes: z.string().optional(),
  type: z.enum(['system', 'feature']).optional()
})

export type RawSmFile = z.infer<typeof RawSmFileSchema>

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