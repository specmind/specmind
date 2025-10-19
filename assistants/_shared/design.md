# /design - Design a new feature

This prompt template contains the core logic for the `/design <feature-name>` command that creates a feature specification.

## Instructions

1. **Get the feature name** from the command argument (e.g., `/design "User Authentication"`)

2. **Slugify the feature name** for the filename:
   ```
   "User Authentication" → "user-authentication"
   ```
   Rules:
   - Convert to lowercase
   - Replace spaces and special characters with hyphens
   - Remove leading/trailing hyphens

3. **Analyze the existing codebase** and system.sm to understand:
   - Current architecture patterns
   - Existing components and services
   - Technology stack and frameworks
   - Integration points

4. **Generate the feature specification:**

   Create a markdown file with:
   - **At least one Mermaid diagram** showing the feature's architecture
   - **Documentation sections** - Use whatever structure makes sense

   **Recommended sections** (customize as needed):
   - **Overview**: What the feature does and why it's needed
   - **Requirements**: Functional and technical requirements
   - **Architecture**: Mermaid diagram showing the feature's components and how they integrate
   - **Design Decisions**: Key choices, trade-offs, and rationale
   - **Integration Points**: Connections to existing system components
   - **Notes**: Implementation considerations, warnings, optimization tips

5. **Create or update** `.specmind/features/{slugified-name}.sm`

6. **Propose architectural changes** to `system.sm` if the feature impacts system-level architecture

## Expected Output

A new (or updated) `.specmind/features/{feature-name}.sm` file with:
- Markdown documentation (flexible structure)
- At least one Mermaid diagram
- Ready for implementation
