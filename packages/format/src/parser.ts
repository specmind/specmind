import { SmFile, SmFileSchema, RawSmFile, RawSmFileSchema } from './schemas.js'

/**
 * Parses a .sm file content from markdown format
 *
 * Expected format (CONSTITUTION.md Section 4.2):
 * ```markdown
 * # Feature Name
 *
 * ## Overview
 * [Markdown description]
 *
 * ## Requirements
 * - [Requirement 1]
 * - [Requirement 2]
 *
 * ## Architecture
 * ```mermaid
 * [Mermaid diagram]
 * ```
 *
 * ## Design Decisions
 * [Rationale]
 *
 * ## Integration Points
 * - [Integration 1]
 * - [Integration 2]
 *
 * ## Notes
 * [Warnings, optimizations]
 * ```
 */

export interface ParseResult {
  success: boolean
  data?: SmFile
  error?: string
}

export function parseSmFile(content: string, type: 'system' | 'feature' = 'feature'): ParseResult {
  try {
    const sections = extractSections(content)

    if (!sections.name) {
      return {
        success: false,
        error: 'Missing feature name (# heading)'
      }
    }

    const rawData: RawSmFile = {
      name: sections.name,
      overview: sections.overview,
      requirements: sections.requirements,
      architecture: sections.architecture,
      designDecisions: sections.designDecisions,
      integrationPoints: sections.integrationPoints,
      notes: sections.notes,
      type
    }

    // Validate raw data first
    const validatedRaw = RawSmFileSchema.parse(rawData)

    // Convert to full SmFile with defaults
    const smFile: SmFile = {
      name: validatedRaw.name,
      overview: validatedRaw.overview || '',
      requirements: validatedRaw.requirements || [],
      architecture: validatedRaw.architecture || '',
      designDecisions: validatedRaw.designDecisions || '',
      integrationPoints: validatedRaw.integrationPoints || [],
      notes: validatedRaw.notes || '',
      type: validatedRaw.type || type,
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const validatedData = SmFileSchema.parse(smFile)

    return {
      success: true,
      data: validatedData
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown parsing error'
    }
  }
}

interface ExtractedSections {
  name?: string
  overview?: string
  requirements?: string[]
  architecture?: string
  designDecisions?: string
  integrationPoints?: string[]
  notes?: string
}

function extractSections(content: string): ExtractedSections {
  const lines = content.split('\n')
  const sections: ExtractedSections = {}

  let currentSection = ''
  let currentContent: string[] = []
  let inCodeBlock = false
  let codeBlockType = ''

  for (const line of lines) {
    const trimmedLine = line.trim()

    // Handle code blocks
    if (trimmedLine.startsWith('```')) {
      if (!inCodeBlock) {
        inCodeBlock = true
        codeBlockType = trimmedLine.slice(3).trim()
        if (currentSection === 'architecture' && codeBlockType === 'mermaid') {
          // Start of mermaid block - don't include the ``` line
          continue
        }
      } else {
        inCodeBlock = false
        if (currentSection === 'architecture' && codeBlockType === 'mermaid') {
          // End of mermaid block - process the content
          sections.architecture = currentContent.join('\n').trim()
          currentContent = []
          currentSection = ''
          continue
        }
        codeBlockType = ''
      }
    }

    // Extract main heading (feature name)
    if (trimmedLine.startsWith('# ') && !inCodeBlock) {
      sections.name = trimmedLine.slice(2).trim()
      continue
    }

    // Extract section headings
    if (trimmedLine.startsWith('## ') && !inCodeBlock) {
      // Process previous section
      if (currentSection && currentContent.length > 0) {
        processSectionContent(sections, currentSection, currentContent)
      }

      currentSection = trimmedLine.slice(3).trim().toLowerCase()
      currentContent = []
      continue
    }

    // Collect content for current section
    if (currentSection && trimmedLine !== '') {
      currentContent.push(line)
    }
  }

  // Process final section
  if (currentSection && currentContent.length > 0) {
    processSectionContent(sections, currentSection, currentContent)
  }

  return sections
}

function processSectionContent(sections: ExtractedSections, sectionName: string, content: string[]) {
  const textContent = content.join('\n').trim()

  switch (sectionName) {
    case 'overview':
      sections.overview = textContent
      break
    case 'requirements':
      sections.requirements = extractListItems(textContent)
      break
    case 'design decisions':
      sections.designDecisions = textContent
      break
    case 'integration points':
      sections.integrationPoints = extractListItems(textContent)
      break
    case 'notes':
      sections.notes = textContent
      break
  }
}

function extractListItems(content: string): string[] {
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.startsWith('- '))
    .map(line => line.slice(2).trim())
    .filter(item => item.length > 0)
}