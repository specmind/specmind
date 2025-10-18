import { describe, it, expect } from 'vitest'
import { writeSmFile, writeSmFileWithMetadata, validateSmFileForWriting } from '../writer.js'
import { SmFile } from '../schemas.js'

describe('writeSmFile', () => {
  it('writes complete .sm file content', () => {
    const smFile: SmFile = {
      name: 'User Authentication',
      overview: 'Implement secure user authentication with JWT tokens.',
      requirements: [
        'Secure password hashing (bcrypt)',
        'JWT token generation and validation',
        'OAuth 2.0 integration'
      ],
      architecture: `graph TD
    Client[Client App] -->|POST /auth/login| AuthAPI[Auth API]
    AuthAPI --> AuthService[Auth Service]`,
      designDecisions: `### Why JWT over sessions?
- Stateless authentication for horizontal scaling
- Better for microservices architecture`,
      integrationPoints: [
        '**User Service**: Validates user credentials',
        '**Email Service**: Sends password reset emails'
      ],
      notes: '⚠️ **Security**: Ensure HTTPS in production',
      type: 'feature',
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-02')
    }

    const result = writeSmFile(smFile)

    expect(result.success).toBe(true)
    expect(result.content).toBeDefined()

    const content = result.content!
    expect(content).toContain('# User Authentication')
    expect(content).toContain('## Overview')
    expect(content).toContain('## Requirements')
    expect(content).toContain('- Secure password hashing (bcrypt)')
    expect(content).toContain('## Architecture')
    expect(content).toContain('```mermaid')
    expect(content).toContain('graph TD')
    expect(content).toContain('```')
    expect(content).toContain('## Design Decisions')
    expect(content).toContain('### Why JWT over sessions?')
    expect(content).toContain('## Integration Points')
    expect(content).toContain('**User Service**')
    expect(content).toContain('## Notes')
    expect(content).toContain('⚠️ **Security**')
  })

  it('writes minimal .sm file content', () => {
    const smFile: SmFile = {
      name: 'Simple Feature',
      overview: '',
      requirements: [],
      architecture: '',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = writeSmFile(smFile)

    expect(result.success).toBe(true)
    expect(result.content).toBe('# Simple Feature')
  })

  it('skips empty sections', () => {
    const smFile: SmFile = {
      name: 'Test Feature',
      overview: 'Has overview',
      requirements: [],
      architecture: 'graph LR\n    A --> B',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = writeSmFile(smFile)

    expect(result.success).toBe(true)
    const content = result.content!

    expect(content).toContain('# Test Feature')
    expect(content).toContain('## Overview')
    expect(content).toContain('Has overview')
    expect(content).toContain('## Architecture')
    expect(content).toContain('```mermaid')
    expect(content).toContain('graph LR')

    // Should not contain empty sections
    expect(content).not.toContain('## Requirements')
    expect(content).not.toContain('## Design Decisions')
    expect(content).not.toContain('## Integration Points')
    expect(content).not.toContain('## Notes')
  })

  it('formats requirements and integration points as lists', () => {
    const smFile: SmFile = {
      name: 'Test Feature',
      overview: '',
      requirements: ['First requirement', 'Second requirement'],
      architecture: '',
      designDecisions: '',
      integrationPoints: ['First integration', 'Second integration'],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = writeSmFile(smFile)

    expect(result.success).toBe(true)
    const content = result.content!

    expect(content).toContain('## Requirements')
    expect(content).toContain('- First requirement')
    expect(content).toContain('- Second requirement')
    expect(content).toContain('## Integration Points')
    expect(content).toContain('- First integration')
    expect(content).toContain('- Second integration')
  })

  it('preserves markdown formatting', () => {
    const smFile: SmFile = {
      name: 'Test Feature',
      overview: 'This has **bold** and *italic* text.\n\nAnd multiple paragraphs.',
      requirements: [],
      architecture: '',
      designDecisions: '### Subsection\n\nWith **formatting**.\n\n```typescript\nconst x = 1;\n```',
      integrationPoints: [],
      notes: '⚠️ **Warning**: Important note\n\n💡 **Tip**: Helpful tip',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = writeSmFile(smFile)

    expect(result.success).toBe(true)
    const content = result.content!

    expect(content).toContain('**bold**')
    expect(content).toContain('*italic*')
    expect(content).toContain('### Subsection')
    expect(content).toContain('```typescript')
    expect(content).toContain('⚠️ **Warning**')
    expect(content).toContain('💡 **Tip**')
  })

  it('removes trailing empty lines', () => {
    const smFile: SmFile = {
      name: 'Test Feature',
      overview: 'Overview content',
      requirements: [],
      architecture: '',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = writeSmFile(smFile)

    expect(result.success).toBe(true)
    const content = result.content!

    expect(content.endsWith('\n\n')).toBe(false)
    expect(content.split('\n')).toHaveLength(5) // "# Test Feature", "", "## Overview", "", "Overview content"
  })
})

describe('writeSmFileWithMetadata', () => {
  it('includes metadata comments', () => {
    const smFile: SmFile = {
      name: 'Test Feature',
      overview: 'Test overview',
      requirements: [],
      architecture: '',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-02T00:00:00Z')
    }

    const result = writeSmFileWithMetadata(smFile)

    expect(result.success).toBe(true)
    const content = result.content!

    expect(content).toContain('<!-- Generated by SpecMind -->')
    expect(content).toContain('<!-- Type: feature -->')
    expect(content).toContain('<!-- Created: 2024-01-01T00:00:00.000Z -->')
    expect(content).toContain('<!-- Updated: 2024-01-02T00:00:00.000Z -->')
    expect(content).toContain('# Test Feature')
  })
})

describe('validateSmFileForWriting', () => {
  it('validates correct SmFile', () => {
    const smFile: SmFile = {
      name: 'Valid Feature',
      overview: 'Valid overview',
      requirements: ['Valid requirement'],
      architecture: 'graph LR\n    A --> B',
      designDecisions: 'Valid decisions',
      integrationPoints: ['Valid integration'],
      notes: 'Valid notes',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = validateSmFileForWriting(smFile)

    expect(result.valid).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('detects empty feature name', () => {
    const smFile: SmFile = {
      name: '   ',
      overview: 'Valid overview',
      requirements: [],
      architecture: '',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = validateSmFileForWriting(smFile)

    expect(result.valid).toBe(false)
    expect(result.issues).toContain('Feature name is required')
  })

  it('detects empty requirements', () => {
    const smFile: SmFile = {
      name: 'Test Feature',
      overview: '',
      requirements: ['Valid requirement', '   ', 'Another valid'],
      architecture: '',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = validateSmFileForWriting(smFile)

    expect(result.valid).toBe(false)
    expect(result.issues).toContain('One or more requirements are empty')
  })

  it('detects problematic content', () => {
    const smFile: SmFile = {
      name: 'Test\nFeature',
      overview: '',
      requirements: [],
      architecture: 'graph LR\n```\nA --> B',
      designDecisions: '',
      integrationPoints: [],
      notes: '',
      type: 'feature',
      createdAt: new Date(),
      updatedAt: new Date()
    }

    const result = validateSmFileForWriting(smFile)

    expect(result.valid).toBe(false)
    expect(result.issues).toContain('Feature name contains newlines')
    expect(result.issues).toContain('Architecture contains code block markers (``` will be added automatically)')
  })
})