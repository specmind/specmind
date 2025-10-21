# SpecMind Design

You are implementing the SpecMind design command to create a feature specification.

**Your task:** Design a new feature based on the provided description.

## Instructions

1. **Get the feature description** from the user:
   - User may provide a simple name: "User Authentication"
   - User may provide a long-form description with details
   - User may include requirements, use cases, or technical details

   **Extract the core feature name** from the description:
   - Identify the main feature/capability being requested
   - For long descriptions, extract 2-4 key words that capture the essence
   - Examples:
     - "Add user authentication with OAuth2..." → "User Authentication"
     - "Implement real-time notifications using WebSockets" → "Real-Time Chat Notifications"

2. **Slugify the feature name** for the filename:
   ```
   "User Authentication" → "user-authentication"
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
   - 🟢 **Green (#90EE90 fill, #2E7D4E stroke)**: New components/interactions added
   - 🔴 **Red (#FFB6C1 fill, #8B0000 stroke)**: Components/interactions to be removed/deprecated
   - 🟡 **Yellow (#FFEB99 fill, #CC9900 stroke)**: Existing components to be modified
   - ⚪ **Default/Gray**: Existing components that remain unchanged

   **Diagram 1 - System Component/Dependency Graph:**
   - Show relevant portions of the existing system architecture
   - Add the new feature's components (in green)
   - Show dependencies between new and existing components
   - Mark any components to be removed (in red)
   - Mark any existing components that will be modified (in yellow)
   - Use `graph TD` or `graph LR` format
   - Apply color styling using Mermaid `style` statements:
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
   - Use clear naming to indicate new vs existing participants

5. **Extract and organize requirements** from the user's description:
   - Parse for explicit requirements
   - Infer implicit requirements from the feature type
   - Categorize: Functional, Technical, Non-functional

6. **Generate markdown documentation:**

   **Recommended sections:**

   - **Overview**: What the feature does and why it's needed
   - **Requirements**: Functional, technical, and non-functional requirements
   - **System Component Architecture**:
     - First Mermaid diagram with color-coded changes
     - **Architectural Impact - Components:**
       - **Added**: New components (green)
       - **Modified**: Changed components (yellow)
       - **Removed**: Deprecated components (red)
   - **System Interaction Flow**:
     - Second Mermaid diagram showing feature flow
     - **Architectural Impact - Interactions:**
       - **Added**: New interactions
       - **Modified**: Changed interactions
       - **Removed**: Deprecated interactions
   - **Design Decisions**: Explain major decisions and trade-offs
   - **Integration Points**: Identify all integration points with existing system
   - **Notes**: Implementation considerations, gotchas, optimization opportunities

7. **Create or update** `.specmind/features/{slugified-name}.sm`

8. **Propose architectural changes** to `system.sm` if needed

## Expected Output

A new `.specmind/features/{feature-name}.sm` file with:
- Markdown documentation
- **Two Mermaid diagrams:**
  1. Component/Dependency graph (structural view)
  2. Sequence diagram (behavioral/flow view)
- Ready for implementation
