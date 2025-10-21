# SpecMind Analyze

You are implementing the SpecMind analyze command.

**Your task:** Analyze the codebase and create system architecture documentation.

## Instructions

1. **Run the analysis tool:**
   ```bash
   specmind analyze --format json
   ```

2. **Parse the JSON output** which contains:
   - `diagram`: Mermaid diagram string (component/dependency graph)
   - `components`: Array of detected components (files, classes, functions)
   - `relationships`: Array of relationships between components
   - `metadata`: Project metadata (language, framework, etc.)

3. **Generate TWO Mermaid diagrams:**

   **Diagram 1 - Component/Dependency Graph:**
   - Use the `diagram` from JSON output as a starting point
   - Shows the main modules, packages, or services
   - Shows dependencies between components
   - Use `graph TD` or `graph LR` format
   - Keep it high-level (don't show every class/function)
   - Use colors that work in both light and dark mode

   **Diagram 2 - Sequence Diagram:**
   - Shows a typical request flow through the system
   - Pick the most common user flow (e.g., API request, data processing pipeline)
   - Shows how components interact over time
   - Use `sequenceDiagram` format
   - Include key steps: entry point → processing → data storage → response
   - Use colors that work in both light and dark mode

4. **Generate markdown documentation:**

   **Recommended sections** (customize as needed):
   - **Overview**: High-level description of the system architecture
   - **Requirements**: Technical requirements and constraints
   - **Design Decisions**: Key architectural decisions and rationale
   - **Integration Points**: How different parts of the system connect
   - **Notes**: Additional context, warnings, or optimization opportunities

   Feel free to add, remove, or modify sections to fit your documentation needs.

5. **Create the .specmind directory structure:**
   ```bash
   mkdir -p .specmind/features
   ```

6. **Write the system.sm file** at `.specmind/system.sm`:
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

7. **Confirm completion** to the user

## Expected Output

The `.specmind/system.sm` file should be created as a markdown file with:
- Documentation sections (structure is flexible)
- **Two Mermaid diagrams:**
  1. Component/Dependency graph (structural view)
  2. Sequence diagram (behavioral/flow view)
