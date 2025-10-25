# /analyze - Analyze Codebase

This prompt template contains the core logic for the `/analyze` command that analyzes a codebase and creates system architecture documentation.

## Instructions

1. **Run the analysis tool:**
   ```bash
   npx specmind analyze
   ```

2. **Review the split analysis output** in `.specmind/system/`:
   - `metadata.json`: Overall summary with services, architecture type, file counts, and cross-service dependencies
   - `sequence-diagram.sm`: Pre-generated cross-service interactions diagram
   - `services/{service}/metadata.json`: Service metadata with cross-layer dependencies
   - `services/{service}/architecture-diagram.sm`: Per-service function call graph
   - `services/{service}/{layer}/`: Per-layer chunked analysis (data, API, service, external layers)

   Each layer directory contains:
   - `summary.json`: Layer overview with chunk manifest, cross-layer dependencies, and layer-specific metadata (databases, APIs, external services)
   - `chunk-N.json`: File analysis chunks (≤256KB each, minified) with files, functions, classes, imports, and same-layer dependencies

3. **Analyze the split structure** to understand:
   - **Services**: How many services exist (monorepo vs monolith)
   - **Layers**: Distribution of code across data/API/service/external layers
   - **Technologies**: Databases, frameworks, external services in use
   - **Dependencies**: Key relationships between layers and services

4. **Review the pre-generated diagrams:**

   The analysis tool has already generated Mermaid diagrams for each service:

   - **Per-Service `architecture-diagram.sm`**: Function call graph showing:
     - Functions and methods grouped by layer (data, API, service, external)
     - Call relationships between functions (arrows showing dependencies)
     - Databases with cylinder notation and brand colors (PostgreSQL blue, MongoDB green, Redis red, etc.)
     - External services with proper styling

   - **Root `sequence-diagram.sm`**: Cross-service interactions showing:
     - Client requests to entry service
     - Service-to-service calls with dependency counts
     - Response flow back to client
     - For monoliths: simple request/response flow

   **You will use these pre-generated diagrams in the system.sm file** rather than creating new ones. Read the diagrams to understand both the internal architecture of each service and how services interact.

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
   - Embed the pre-generated Mermaid diagrams from the analysis
   - For multi-service systems: Include the root `sequence-diagram.sm` and reference per-service diagrams
   - For monoliths: Include both the service's `architecture-diagram.sm` and root `sequence-diagram.sm`
   - Example structure (customize as needed):
     ```markdown
     # System Architecture

     ## Overview
     [Your generated overview]

     ## Service Architecture
     [For each service, copy its architecture-diagram.sm to show internal structure]

     ## Cross-Service Interactions
     [Copy the root sequence-diagram.sm to show service-to-service calls]

     [Additional sections as needed]
     ```

8. **Confirm completion** to the user

## Expected Output

The `.specmind/system.sm` file should be created as a markdown file with:
- Documentation sections (structure is flexible)
- **Pre-generated Mermaid diagrams** (copied from the generated diagram files):
  - Per-service architecture diagrams showing function call graphs
  - Cross-service sequence diagram showing interactions

## Notes

- Each service has its own architecture diagram showing functions, methods, and their dependencies
- The root sequence diagram shows how services interact with each other
- Diagrams are automatically generated with accurate database colors, cylinder notation, and function-level detail
- You should read and copy the pre-generated diagrams rather than creating new ones
- This ensures consistency between the code analysis and the documentation
