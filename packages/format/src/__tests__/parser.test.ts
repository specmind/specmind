import { describe, it, expect } from 'vitest'
import { extractMermaidDiagrams, validateSmFile, parseSmFile, tryParseSmFile } from '../parser.js'

describe('extractMermaidDiagrams', () => {
  it('should extract single Mermaid diagram', () => {
    const markdown = `
# Feature

## Architecture
\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`
    const diagrams = extractMermaidDiagrams(markdown)
    expect(diagrams).toHaveLength(1)
    expect(diagrams[0]).toBe('graph TD\n  A --> B')
  })

  it('should extract multiple Mermaid diagrams', () => {
    const markdown = `
# Feature

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

\`\`\`mermaid
sequenceDiagram
  Alice->>Bob: Hello
\`\`\`
`
    const diagrams = extractMermaidDiagrams(markdown)
    expect(diagrams).toHaveLength(2)
    expect(diagrams[0]).toContain('graph TD')
    expect(diagrams[1]).toContain('sequenceDiagram')
  })

  it('should return empty array if no diagrams', () => {
    const markdown = '# Feature\n\nJust some text'
    const diagrams = extractMermaidDiagrams(markdown)
    expect(diagrams).toHaveLength(0)
  })

  it('should ignore non-mermaid code blocks', () => {
    const markdown = `
\`\`\`typescript
const x = 1
\`\`\`

\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`
    const diagrams = extractMermaidDiagrams(markdown)
    expect(diagrams).toHaveLength(1)
    expect(diagrams[0]).toContain('graph TD')
  })
})

describe('validateSmFile', () => {
  it('should validate file with diagram', () => {
    const content = `
# Feature
\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`
    const result = validateSmFile(content)
    expect(result.valid).toBe(true)
    expect(result.error).toBeUndefined()
  })

  it('should reject empty content', () => {
    const result = validateSmFile('')
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Content cannot be empty')
  })

  it('should reject content without diagrams', () => {
    const content = '# Feature\n\nSome text without diagrams'
    const result = validateSmFile(content)
    expect(result.valid).toBe(false)
    expect(result.error).toBe('Must have at least one Mermaid diagram')
  })
})

describe('parseSmFile', () => {
  it('should parse valid .sm file', () => {
    const content = `
# User Authentication

## Overview
Secure authentication system.

## Architecture
\`\`\`mermaid
graph TD
  Client --> AuthAPI
  AuthAPI --> Database
\`\`\`

## Notes
Some notes here.
`
    const result = parseSmFile(content)
    expect(result.content).toBe(content)
    expect(result.diagrams).toHaveLength(1)
    expect(result.diagrams[0]).toContain('Client --> AuthAPI')
  })

  it('should throw error for invalid content', () => {
    expect(() => parseSmFile('')).toThrow('Content cannot be empty')
    expect(() => parseSmFile('No diagrams here')).toThrow(
      'Must have at least one Mermaid diagram'
    )
  })

  it('should preserve full markdown content', () => {
    const content = `# Feature

Custom section here

\`\`\`mermaid
graph TD
  A --> B
\`\`\`

Another custom section
`
    const result = parseSmFile(content)
    expect(result.content).toBe(content)
  })
})

describe('tryParseSmFile', () => {
  it('should return success for valid content', () => {
    const content = `
# Feature
\`\`\`mermaid
graph TD
  A --> B
\`\`\`
`
    const result = tryParseSmFile(content)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.diagrams).toHaveLength(1)
    }
  })

  it('should return error for invalid content', () => {
    const result = tryParseSmFile('')
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('Content cannot be empty')
    }
  })
})
