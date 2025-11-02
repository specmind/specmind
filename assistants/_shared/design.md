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

4. **Generate Mermaid diagrams showing how system.sm will be updated:**

   **Color Coding for all diagrams:**
   - 🟢 **Green (#4c5a2b fill, #3d4722 stroke)**: New components/services/flows
   - 🟠 **Orange (#d97706 fill, #b45309 stroke)**: Modified components/services
   - 🔴 **Red (#701f1c fill, #5a1916 stroke)**: Removed/deprecated components
   - ⚪ **Default**: Unchanged components (use standard colors)

   **System Architecture Diagram (graph TB):**
   - Show global system with this feature integrated
   - Include services, databases, external systems affected by this feature
   - Color-code: new services (green), modified services (orange), removed services (red)
   - Show new communication patterns between services
   - Use style statements: `style NewService fill:#4c5a2b,stroke:#3d4722,stroke-width:2px`

   **Cross-Service Flow Diagrams (sequenceDiagram):**
   - Create diagrams for new flows or show updates to existing flows
   - One diagram per flow affected by this feature
   - Show complete request/response cycle through services
   - Include HTTP methods, paths, and key operations
   - Use clear naming to indicate new vs existing participants

   **Service Architecture Diagrams (graph TB):**
   - For each affected service, show updated architecture
   - Organize by layers vertically: API → Service → Data → External (top to bottom)
   - Use subgraphs for each layer to ensure vertical stacking
   - Color-code: new classes (green), modified classes (orange), removed classes (red)
   - Show method signatures and calls between layers
   - **IMPORTANT**: Use actual angle brackets `<` and `>` in Mermaid diagrams - they don't need escaping. Only use HTML entities like `&lt;` if you're writing raw markdown text outside code blocks.

5. **Extract and organize requirements** from the user's description:
   - Parse the user's input for explicit requirements (OAuth2, Google/GitHub providers, session management, etc.)
   - Infer implicit requirements from the feature type (e.g., auth needs security, real-time needs WebSockets)
   - Categorize requirements:
     - **Functional**: What the feature must do (user stories, capabilities)
     - **Technical**: How it should be built (technologies, patterns, constraints)
     - **Non-functional**: Performance, security, scalability, UX considerations
   - If user provided use cases, extract and document them
   - If user mentioned technical details, incorporate them into the design

6. **Generate markdown documentation:**

   **IMPORTANT: File must start with H1 title:**
   - **# {Feature Name}** - Use the extracted feature name as the main title at the top

   **Recommended sections** (customize as needed):

   - **## Overview**:
     - What the feature does and why it's needed
     - Core value proposition
     - How it fits into the broader product vision

   - **## Requirements**:
     - Functional requirements (what users can do)
     - Technical requirements (technologies, APIs, integrations)
     - Non-functional requirements (performance targets, security needs)
     - If user provided detailed description, organize extracted requirements here

   - **## System Architecture Updates**:
     - Show how the global System Architecture diagram will change
     - Mermaid diagram with color-coded changes:
       - 🟢 Green: New services, databases, or external integrations
       - 🟠 Orange: Modified services
       - 🔴 Red: Removed services/components
     - **Impact:**
       - **Services**: List new/modified/removed services
       - **Data Stores**: List new databases or caches
       - **External Integrations**: List new third-party services
       - **Communication Patterns**: Describe new inter-service communication

   - **## Cross-Service Flows Updates**:
     - Sequence diagrams showing new or updated flows
     - One diagram per affected flow (e.g., "Create Task Flow", "Update Task Flow")
     - Show complete request/response cycle with color-coded changes
     - **Impact:**
       - **New Flows**: List flows to be added
       - **Modified Flows**: List existing flows that will change
       - **Removed Flows**: List flows to be deprecated

   - **## Service Architecture Updates**:
     - Show which services will be modified or created
     - For each affected service, show updated architecture diagram with:
       - Classes/methods organized by layer (API, Service, Data, External)
       - Color-coded changes (green=new, orange=modified, red=removed)
     - **Impact:**
       - **New Services**: List services to be created
       - **Modified Services**: List services to be updated with changes
       - **Affected Layers**: Describe changes per layer

   - **## Design Decisions**:
     - **For each major decision, explain:**
       - What options were considered
       - Which option was chosen and why
       - Trade-offs and implications
     - **Examples of decisions to document:**
       - Technology choices (why GraphQL vs REST, why Redis vs in-memory)
       - Architecture patterns (why microservices vs monolith, why event-driven vs request-response)
       - Data modeling choices (why NoSQL vs SQL, schema design)
       - Security approaches (authentication method, authorization pattern)
       - Scalability strategies (caching, load balancing, database sharding)

   - **## Integration Points**:
     - **Explicitly identify:**
       - Which existing components/services this feature will interact with
       - What APIs or interfaces will be used
       - What new APIs or interfaces this feature will expose
       - Data dependencies (databases, caches, message queues)
       - External service integrations (third-party APIs, SaaS tools)
     - **For each integration point, specify:**
       - Direction of dependency (who calls whom)
       - Data format and protocol
       - Error handling and fallback strategies

   - **## Summary**:
     - High-level recap of the feature design
     - Key technologies and patterns used
     - Main architectural changes
     - Implementation considerations
     - Potential challenges and mitigation strategies

   Feel free to add, remove, or modify sections to fit your documentation needs.

7. **Create** `.specmind/features/{slugified-name}.sm` with all sections and diagrams

8. **Note**: The diagrams in this feature spec show PROPOSED changes to system.sm with color coding. During `/implement`, these changes will be applied to system.sm with colors removed.

## Expected Output

A new (or updated) `.specmind/features/{feature-name}.sm` file with:
- Markdown documentation (flexible structure)
- **Two Mermaid diagrams:**
  1. Component/Dependency graph (structural view)
  2. Sequence diagram (behavioral/flow view)
- Ready for implementation
