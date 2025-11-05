# /design - Design a new feature

This prompt template contains the core logic for the `/design <feature-name>` command that creates a feature specification.

## Instructions

1. **Get the feature description** from the command argument:
   - User may provide a simple name: `/design "User Authentication"`
   - User may provide a long-form description with details: `/design "Add user authentication with OAuth2 support, including Google and GitHub providers, with session management and role-based access control"`
   - User may include requirements, use cases, or technical details in their description

   **Extract the core feature name** from the description:
   - Identify the main feature/capability being requested
   - For long descriptions, extract 2-4 key words that capture the essence
   - Examples:
     - "Add user authentication with OAuth2..." → "User Authentication"
     - "Implement real-time notifications using WebSockets for chat messages" → "Real-Time Chat Notifications"
     - "Create an analytics dashboard showing user metrics and activity" → "Analytics Dashboard"

2. **Slugify the feature name** for the filename:
   ```
   "User Authentication" → "user-authentication"
   "Real-Time Chat Notifications" → "real-time-chat-notifications"
   ```
   Rules:
   - Convert to lowercase
   - Replace spaces and special characters with hyphens
   - Remove leading/trailing hyphens
   - Keep it concise (3-4 words maximum)

3. **Analyze the existing codebase** and system.sm to understand:
   - Current architecture patterns
   - Existing components and services
   - Technology stack and frameworks
   - Integration points
   - **Existing data models** - Check system.sm for entity information:
     - Read `.specmind/system.sm` and look for "### Data Models" sections under each service
     - If ER diagrams exist, understand existing database schema from the diagrams
     - Consider entity relationships when designing features that touch data layer
     - Reference existing entities in your design to maintain consistency

4. **Generate `.specmind/features/{slugified-name}.sm`** with these sections:

   **IMPORTANT: File must start with H1 title:**
   - **# {Feature Name}** - Use the extracted feature name as the main title

   **Required sections:**

   - **## Overview**
     - Brief description: What the feature does and why it's needed
     - Core value proposition
     - How it fits into the broader product vision

   - **## Requirements**
     - **### Functional Requirements** - What users can do with this feature
       - Parse user's input for explicit functional requirements
       - Infer implicit requirements from feature type (e.g., auth needs user login/logout)
       - Document as user stories or capabilities
     - **### Technical Requirements** - Technologies, APIs, integrations needed
       - Extract technical details from user's description (OAuth2, specific providers, etc.)
       - Specify technologies, frameworks, libraries to be used
       - Document API integrations and data dependencies
     - **### Non-Functional Requirements** - Performance, security, scalability targets
       - Infer from feature type (e.g., auth needs security, real-time needs low latency)
       - Document performance targets, security needs, scalability considerations
       - Include UX and accessibility requirements

   - **## System Architecture**
     - Brief description: How this feature affects the global system architecture
     - Mermaid flowchart TB diagram with color-coded changes:
       - **CRITICAL**: Start with ELK layout config:
         ```mermaid
         ---
         config:
           layout: elk
         ---
         flowchart TB
           ...
         ```
       - Show global system with this feature integrated
       - Include services, databases, external systems affected by this feature
       - **Color coding:**
         - 🟢 Green (#4c5a2b fill, #3d4722 stroke): New services, databases, external integrations
         - 🟠 Orange (#d97706 fill, #b45309 stroke): Modified services
         - 🔴 Red (#701f1c fill, #5a1916 stroke): Removed services/components
         - ⚪ Default: Unchanged components (use standard colors)
       - Use style statements: `style NewService fill:#4c5a2b,stroke:#3d4722,stroke-width:2px`
       - Show new communication patterns between services
     - **### Impact**
       - **Services**: List new/modified/removed services with brief explanation
       - **Data Stores**: List new databases or caches
       - **External Integrations**: List new third-party services
       - **Communication Patterns**: Describe new inter-service communication

   - **## Cross-Service Flows** (if applicable)
     - Include subsections for NEW flows, MODIFIED flows, and REMOVED flows
     - **### {Flow Name} Flow** (one subsection per affected flow)
       - **Status indicator**: Start with 🟢 NEW, 🟠 MODIFIED, or 🔴 REMOVED emoji
       - Mermaid sequenceDiagram:
         - Show complete request/response cycle through services
         - Include HTTP methods, paths, and key operations
         - For MODIFIED flows: use participant aliases to indicate changes:
           - `participant NewService as "NewService (NEW)"`
           - `participant ModifiedService as "ModifiedService (MODIFIED)"`
         - For REMOVED flows: note "This flow will be deprecated" in Summary
         - Sequence diagrams don't need ELK config (only for flowchart types)
       - **#### Summary**: Brief description of what this flow does and what's changing
       - **#### Participants**: List services involved, marking NEW/MODIFIED/REMOVED participants
       - **#### Key Operations**: Main operations, highlighting new or changed steps
     - Repeat for each new or modified flow

   - **## Service Changes** (one subsection per affected service)
     - **### {service-name} Service**
       - Brief description: How this service is affected by the feature
       - Mermaid flowchart TB diagram with color-coded changes:
         - **CRITICAL**: Start with ELK layout config (see System Architecture example above)
         - Organize by layers vertically: API → Service → Data → External (top to bottom)
         - Use subgraphs for each layer to ensure vertical stacking
         - **Color coding:**
           - 🟢 Green: New classes/methods
           - 🟠 Orange: Modified classes/methods
           - 🔴 Red: Removed classes/methods
         - Show method signatures and calls between layers
         - **IMPORTANT**: Use actual angle brackets `<` and `>` in Mermaid diagrams - they don't need escaping
       - **#### Affected Layers**
         - **API Layer**: List new/modified/removed endpoints with method signatures
         - **Service Layer**: List new/modified/removed service methods
         - **Data Layer**: List new/modified/removed repository methods or queries
         - **External Layer**: List new/modified/removed external service integrations
       - **#### Data Models** (optional, if this service's data model is affected)
         - Mermaid erDiagram with color-coded entity changes:
           - **CRITICAL**: Start with ELK layout config:
             ```mermaid
             ---
             config:
               layout: elk
             ---
             erDiagram
               ...
             ```
           - **Color coding entities using style statements:**
             - 🟢 New entities: `style NewEntity fill:#4c5a2b,stroke:#3d4722,stroke-width:2px`
             - 🟠 Modified entities: `style ModifiedEntity fill:#d97706,stroke:#b45309,stroke-width:2px`
             - 🔴 Removed entities: `style RemovedEntity fill:#701f1c,stroke:#5a1916,stroke-width:2px`
           - Show all fields with PK/UK/FK markers
           - Show relationships using Mermaid notation:
             - `oneToMany` (||--o{): One entity has many related entities
             - `manyToOne` (}o--||): Many entities belong to one entity
             - `manyToMany` (}o--o{): Many-to-many relationship
             - `oneToOne` (||--||): One-to-one relationship
           - Include both existing (unchanged) and new/modified entities for context
         - **Entity Changes**
           - **New Entities**: For each new entity, list key fields with types/constraints
           - **Modified Entities**: For each modified entity, specify exact changes
           - **Removed Entities**: List entities being deprecated
           - **Relationship Changes**: Document new/modified/removed relationships
         - **Migration Strategy**
           - Note breaking changes and required data transformations
           - Specify migration approach (e.g., blue-green, rolling updates)
           - Document indexes, validations, and business rules
           - Reference existing entities from system.sm "### Data Models" sections

   - **## Design Decisions**
     - **### {Decision Topic}** (one subsection per major decision)
       - **Options Considered**: List alternatives evaluated
       - **Chosen Approach**: Which option was selected
       - **Rationale**: Why this option was chosen
       - **Trade-offs**: Pros, cons, and implications
     - Common decision topics:
       - Technology choices (GraphQL vs REST, Redis vs in-memory)
       - Architecture patterns (microservices vs monolith, event-driven vs request-response)
       - Data modeling (NoSQL vs SQL, schema design, entity relationships)
       - Security (authentication method, authorization pattern)
       - Scalability (caching, load balancing, database sharding)

   - **## Integration Points**
     - Brief description: How this feature integrates with existing system
     - **### Existing Components**
       - List components/services this feature interacts with
       - Specify APIs or interfaces used
       - Document data dependencies (databases, caches, queues)
     - **### New APIs**
       - List new APIs or interfaces this feature exposes
       - Specify data format, protocol, error handling
     - **### External Services**
       - List third-party integrations (APIs, SaaS tools)
       - Document direction of dependency, fallback strategies

   - **## Implementation Plan**
     - **### Phase 1**: Initial implementation steps
     - **### Phase 2**: Subsequent steps (if multi-phase)
     - **### Testing Strategy**: How to test the feature
     - **### Rollout Plan**: Deployment approach and considerations

   - **## Summary**
     - High-level recap of the feature design
     - Key technologies and patterns used
     - Main architectural changes
     - Critical implementation considerations
     - Potential challenges and mitigation strategies

5. **Note**: The diagrams in this feature spec show PROPOSED changes to system.sm with color coding. During `/implement`, these changes will be applied to system.sm with colors removed.

## Expected Output

A new (or updated) `.specmind/features/{feature-name}.sm` file with:
- Markdown documentation with prescribed section structure
- **Mermaid diagrams with color-coded changes:**
  - System Architecture diagram (flowchart TB)
  - Cross-Service Flow diagrams (sequenceDiagram) - one per flow
  - Service Architecture diagrams (flowchart TB) - one per affected service
  - Entity Relationship diagram (erDiagram) - if feature affects data models
- Complete requirements, design decisions, integration points, and implementation plan
- Ready for implementation via `/implement`
