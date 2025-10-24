# /analyze - Analyze Codebase

This prompt template contains the core logic for the `/analyze` command that analyzes a codebase and creates system architecture documentation.

## Instructions

1. **Run the analysis tool:**
   ```bash
   npx specmind analyze
   ```

2. **Review the split analysis output** in `.specmind/analysis/`:
   - `metadata.json`: Overall summary with services, architecture type, file counts
   - `services/{service}/`: Per-service layer analysis (data, API, service, external layers)
   - `layers/`: Cross-service layer views showing system-wide patterns

   Each layer file contains:
   - Files in that layer with their functions, classes, and imports
   - Internal dependencies (within the layer)
   - Cross-layer dependencies (to other layers)
   - Layer-specific metadata (databases, APIs, external services, etc.)

3. **Analyze the split structure** to understand:
   - **Services**: How many services exist (monorepo vs monolith)
   - **Layers**: Distribution of code across data/API/service/external layers
   - **Technologies**: Databases, frameworks, external services in use
   - **Dependencies**: Key relationships between layers and services

4. **Generate TWO Mermaid diagrams:**

   **Diagram 1 - Component/Dependency Graph:**
   - Shows the main services (if monorepo) or main modules (if monolith)
   - Shows dependencies between components
   - Highlight key architectural layers (data, API, service, external)
   - Use `graph TD` or `graph LR` format
   - Keep it high-level (focus on services and major modules)
   - Use colors that work in both light and dark mode

   **Diagram 2 - Sequence Diagram:**
   - Shows a typical request flow through the layers
   - Example: API request → service layer → data layer → response
   - Shows how different layers interact over time
   - Use `sequenceDiagram` format
   - Include key steps through the architectural layers
   - Use colors that work in both light and dark mode

5. **Generate markdown documentation:**

   **Recommended sections** (customize as needed):
   - **Overview**: High-level description of the system architecture
   - **Services**: List services (if monorepo) and their purposes
   - **Architectural Layers**: Describe data/API/service/external layer responsibilities
   - **Technology Stack**: Databases, frameworks, external services detected
   - **Design Decisions**: Key architectural decisions and rationale
   - **Integration Points**: How different parts of the system connect
   - **Notes**: Additional context, warnings, or optimization opportunities

   Feel free to add, remove, or modify sections to fit your documentation needs.

6. **Create the .specmind directory structure:**
   ```bash
   mkdir -p .specmind/features
   ```

7. **Write the system.sm file** at `.specmind/system.sm`:
   - Include markdown documentation with your chosen sections
   - Embed BOTH Mermaid diagrams
   - Example structure (customize as needed):
     ```markdown
     # System Architecture

     ## Overview
     [Your generated overview]

     ## Component Architecture
     ```mermaid
     [Component/Dependency diagram]
     ```

     ## Request Flow
     ```mermaid
     [Sequence diagram showing typical request flow]
     ```

     [Additional sections as needed]
     ```

8. **Confirm completion** to the user

## Expected Output

The `.specmind/system.sm` file should be created as a markdown file with:
- Documentation sections (structure is flexible)
- **Two Mermaid diagrams:**
  1. Component/Dependency graph (structural view)
  2. Sequence diagram (behavioral/flow view)
