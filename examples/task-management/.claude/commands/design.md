---
description: Design a new feature - create feature specification in .specmind/features/
---

You are implementing the `/design` command for SpecMind.

**Your task:** Follow the instructions in the shared prompt template to design a feature.

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

4. **Generate TWO Mermaid diagrams showing the SYSTEM with this feature integrated:**

   **Important:** Show the relevant portions of the existing system architecture WITH the new feature integrated. Use color coding to highlight what changes.

   **Color Coding for Changes:**
   - 🟢 **Green (#90EE90 fill, #2E7D4E stroke)**: New components/interactions added by this feature
   - 🔴 **Red (#FFB6C1 fill, #8B0000 stroke)**: Components/interactions to be removed/deprecated
   - 🟡 **Yellow (#FFEB99 fill, #CC9900 stroke)**: Existing components that will be modified
   - ⚪ **Default/Gray**: Existing components that remain unchanged (use standard colors)

   **Diagram 1 - System Component/Dependency Graph:**
   - Show relevant portions of the existing system architecture
   - Add the new feature's components (in green)
   - Show dependencies between new and existing components
   - Mark any components to be removed (in red)
   - Mark any existing components that will be modified (in yellow)
   - Use `graph TD` or `graph LR` format
   - Apply color styling using Mermaid `style` statements
   - Example:
     ```
     style NewAuthService fill:#90EE90,stroke:#2E7D4E,stroke-width:2px
     style APIGateway fill:#FFEB99,stroke:#CC9900,stroke-width:2px
     style OldAuthModule fill:#FFB6C1,stroke:#8B0000,stroke-width:2px
     ```

   **Diagram 2 - System Sequence Diagram:**
   - Show a typical flow through the system including this feature
   - Pick the most common user interaction or data flow
   - Show how new and existing components interact over time
   - Use `sequenceDiagram` format
   - Include key steps: entry point → new components → existing components → response
   - Note: Sequence diagrams don't support node styling, so use clear naming to indicate new vs existing participants
   - Example: `NewAuthService` (clearly named as new), `ExistingUserDB` (clearly named as existing)

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

   **Recommended sections** (customize as needed):

   - **Overview**:
     - What the feature does and why it's needed
     - Core value proposition
     - How it fits into the broader product vision

   - **Requirements**:
     - Functional requirements (what users can do)
     - Technical requirements (technologies, APIs, integrations)
     - Non-functional requirements (performance targets, security needs)
     - If user provided detailed description, organize extracted requirements here

   - **System Component Architecture**:
     - First Mermaid diagram (component/dependency graph with color-coded changes)
     - Brief explanation of major components
     - **Architectural Impact - Components:**
       - **Added**: List all new components (shown in green)
       - **Modified**: List all existing components that will change (shown in yellow)
       - **Removed**: List all components to be removed/deprecated (shown in red)
       - **Dependencies**: Describe new dependencies created

   - **System Interaction Flow**:
     - Second Mermaid diagram (sequence diagram showing feature flow through system)
     - Walk through a typical user interaction
     - **Architectural Impact - Interactions:**
       - **Added**: List all new interactions/API calls
       - **Modified**: List all existing interactions that will change
       - **Removed**: List all interactions to be removed/deprecated

   - **Design Decisions**:
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

   - **Integration Points**:
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

   - **Notes**:
     - Implementation considerations
     - Potential gotchas or challenges
     - Performance optimization opportunities
     - Security warnings
     - Future enhancement possibilities

   Feel free to add, remove, or modify sections to fit your documentation needs.

7. **Create or update** `.specmind/features/{slugified-name}.sm`

8. **Propose architectural changes** to `system.sm` if the feature impacts system-level architecture

## Expected Output

A new (or updated) `.specmind/features/{feature-name}.sm` file with:
- Markdown documentation (flexible structure)
- **Two Mermaid diagrams:**
  1. Component/Dependency graph (structural view)
  2. Sequence diagram (behavioral/flow view)
- Ready for implementation


Execute the steps above to create a complete feature specification file.
