# /analyze - Analyze Codebase

This prompt template contains the core logic for the `/analyze` command that analyzes a codebase and creates system architecture documentation.

## Instructions

1. **Run the analysis tool:**
   ```bash
   specmind analyze --format json
   ```

2. **Parse the JSON output** which contains:
   - `diagram`: Mermaid diagram string (architecture visualization)
   - `components`: Array of detected components (files, classes, functions)
   - `relationships`: Array of relationships between components
   - `metadata`: Project metadata (language, framework, etc.)

3. **Generate markdown documentation:**

   **Recommended sections** (customize as needed):
   - **Overview**: High-level description of the system architecture
   - **Requirements**: Technical requirements and constraints
   - **Design Decisions**: Key architectural decisions and rationale
   - **Integration Points**: How different parts of the system connect
   - **Notes**: Additional context, warnings, or optimization opportunities

   Feel free to add, remove, or modify sections to fit your documentation needs.

4. **Create the .specmind directory structure:**
   ```bash
   mkdir -p .specmind/features
   ```

5. **Write the system.sm file** at `.specmind/system.sm`:
   - Include markdown documentation with your chosen sections
   - Embed the Mermaid diagram from the JSON output
   - Example structure (customize as needed):
     ```markdown
     # System Architecture

     ## Overview
     [Your generated overview]

     ## Architecture
     ```mermaid
     [Diagram from JSON output]
     ```

     [Additional sections as needed]
     ```

6. **Confirm completion** to the user

## Expected Output

The `.specmind/system.sm` file should be created as a markdown file with:
- Documentation sections (structure is flexible)
- At least one Mermaid diagram for architecture visualization
