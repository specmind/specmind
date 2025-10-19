import { SmFile, SmFileSchema } from './schemas.js'

/**
 * Extracts all Mermaid diagrams from markdown content
 *
 * @param markdown Markdown content
 * @returns Array of Mermaid diagram strings (without the ``` markers)
 */
export function extractMermaidDiagrams(markdown: string): string[] {
  const diagrams: string[] = []
  const lines = markdown.split('\n')

  let inMermaidBlock = false
  let currentDiagram: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()

    if (trimmed === '```mermaid') {
      inMermaidBlock = true
      currentDiagram = []
      continue
    }

    if (trimmed === '```' && inMermaidBlock) {
      inMermaidBlock = false
      if (currentDiagram.length > 0) {
        diagrams.push(currentDiagram.join('\n').trim())
      }
      currentDiagram = []
      continue
    }

    if (inMermaidBlock) {
      currentDiagram.push(line)
    }
  }

  return diagrams
}

/**
 * Validates that content is a valid .sm file
 *
 * Requirements:
 * - Non-empty content
 * - At least one Mermaid diagram
 *
 * @param content Markdown content
 * @returns Validation result
 */
export function validateSmFile(content: string): { valid: boolean; error?: string } {
  if (!content || content.trim().length === 0) {
    return {
      valid: false,
      error: 'Content cannot be empty'
    }
  }

  const diagrams = extractMermaidDiagrams(content)

  if (diagrams.length === 0) {
    return {
      valid: false,
      error: 'Must have at least one Mermaid diagram'
    }
  }

  return { valid: true }
}

/**
 * Parses a .sm file content
 *
 * @param content Markdown content
 * @returns Parsed SmFile object
 * @throws Error if validation fails
 */
export function parseSmFile(content: string): SmFile {
  const validation = validateSmFile(content)

  if (!validation.valid) {
    throw new Error(validation.error)
  }

  const diagrams = extractMermaidDiagrams(content)

  const smFile: SmFile = {
    content,
    diagrams
  }

  return SmFileSchema.parse(smFile)
}

/**
 * Safe version of parseSmFile that returns a result object
 *
 * @param content Markdown content
 * @returns Parse result with success flag
 */
export function tryParseSmFile(content: string):
  | { success: true; data: SmFile }
  | { success: false; error: string }
{
  try {
    const data = parseSmFile(content)
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    }
  }
}
