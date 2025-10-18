import { describe, it, expect } from 'vitest'
import { parseSmFile } from '../parser.js'

describe('parseSmFile', () => {
  it('parses complete .sm file content', () => {
    const content = `# User Authentication

## Overview
Implement secure user authentication with JWT tokens, supporting email/password
and OAuth providers (Google, GitHub).

## Requirements
- Secure password hashing (bcrypt)
- JWT token generation and validation
- OAuth 2.0 integration
- Session management
- Password reset flow

## Architecture

\`\`\`mermaid
graph TD
    Client[Client App] -->|POST /auth/login| AuthAPI[Auth API]
    AuthAPI --> AuthService[Auth Service]
    AuthService --> UserDB[(User Database)]
    AuthService --> TokenService[JWT Token Service]
\`\`\`

## Design Decisions

### Why JWT over sessions?
- Stateless authentication for horizontal scaling
- Better for microservices architecture
- Mobile app support

### Why Redis for token blacklist?
- Fast lookup for revoked tokens
- Automatic expiration (TTL)
- Scalable for high traffic

## Integration Points
- **User Service**: Validates user credentials
- **Email Service**: Sends password reset emails
- **Logging Service**: Audit trail for auth events

## Notes
⚠️ **Security**: Ensure HTTPS in production
💡 **Optimization**: Consider refresh token rotation`

    const result = parseSmFile(content, 'feature')

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()

    const data = result.data!
    expect(data.name).toBe('User Authentication')
    expect(data.overview).toContain('Implement secure user authentication')
    expect(data.requirements).toHaveLength(5)
    expect(data.requirements[0]).toBe('Secure password hashing (bcrypt)')
    expect(data.architecture).toContain('graph TD')
    expect(data.designDecisions).toContain('Why JWT over sessions?')
    expect(data.integrationPoints).toHaveLength(3)
    expect(data.integrationPoints[0]).toBe('**User Service**: Validates user credentials')
    expect(data.notes).toContain('⚠️ **Security**')
    expect(data.type).toBe('feature')
  })

  it('parses minimal .sm file content', () => {
    const content = `# Simple Feature

## Overview
A simple feature description.

## Architecture

\`\`\`mermaid
graph LR
    A --> B
\`\`\``

    const result = parseSmFile(content, 'feature')

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()

    const data = result.data!
    expect(data.name).toBe('Simple Feature')
    expect(data.overview).toBe('A simple feature description.')
    expect(data.requirements).toHaveLength(0)
    expect(data.architecture).toBe('graph LR\n    A --> B')
    expect(data.designDecisions).toBe('')
    expect(data.integrationPoints).toHaveLength(0)
    expect(data.notes).toBe('')
  })

  it('handles missing sections gracefully', () => {
    const content = `# Feature Name

## Overview
Just an overview.`

    const result = parseSmFile(content)

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()

    const data = result.data!
    expect(data.name).toBe('Feature Name')
    expect(data.overview).toBe('Just an overview.')
    expect(data.requirements).toHaveLength(0)
    expect(data.architecture).toBe('')
  })

  it('fails when feature name is missing', () => {
    const content = `## Overview
No feature name here.`

    const result = parseSmFile(content)

    expect(result.success).toBe(false)
    expect(result.error).toContain('Missing feature name')
  })

  it('extracts requirements list correctly', () => {
    const content = `# Feature

## Requirements
- First requirement
- Second requirement with details
- Third one

## Overview
Some text.`

    const result = parseSmFile(content)

    expect(result.success).toBe(true)
    expect(result.data!.requirements).toEqual([
      'First requirement',
      'Second requirement with details',
      'Third one'
    ])
  })

  it('extracts integration points correctly', () => {
    const content = `# Feature

## Integration Points
- **Service A**: Does something important
- **Service B**: Another integration
- Simple integration point`

    const result = parseSmFile(content)

    expect(result.success).toBe(true)
    expect(result.data!.integrationPoints).toEqual([
      '**Service A**: Does something important',
      '**Service B**: Another integration',
      'Simple integration point'
    ])
  })

  it('handles mermaid diagrams with complex content', () => {
    const content = `# Feature

## Architecture

\`\`\`mermaid
graph TD
    A[Component A] -->|API Call| B[Component B]
    B --> C{Decision}
    C -->|Yes| D[Success Path]
    C -->|No| E[Error Path]

    subgraph "External Services"
        F[Database]
        G[Cache]
    end

    B --> F
    B --> G
\`\`\``

    const result = parseSmFile(content)

    expect(result.success).toBe(true)
    expect(result.data!.architecture).toContain('graph TD')
    expect(result.data!.architecture).toContain('Component A')
    expect(result.data!.architecture).toContain('External Services')
  })

  it('preserves markdown formatting in text sections', () => {
    const content = `# Feature

## Overview
This has **bold** and *italic* text.

Also has:
- Nested list item
- Another item

And a [link](https://example.com).

## Design Decisions

### Subsection
With more **formatting**.

\`\`\`typescript
const code = 'example';
\`\`\`

Regular text after code.`

    const result = parseSmFile(content)

    expect(result.success).toBe(true)
    const data = result.data!

    expect(data.overview).toContain('**bold**')
    expect(data.overview).toContain('*italic*')
    expect(data.overview).toContain('[link](https://example.com)')

    expect(data.designDecisions).toContain('### Subsection')
    expect(data.designDecisions).toContain('```typescript')
    expect(data.designDecisions).toContain('const code')
  })

  it('sets type correctly', () => {
    const content = `# System Architecture

## Overview
System overview.`

    const systemResult = parseSmFile(content, 'system')
    expect(systemResult.data!.type).toBe('system')

    const featureResult = parseSmFile(content, 'feature')
    expect(featureResult.data!.type).toBe('feature')
  })
})