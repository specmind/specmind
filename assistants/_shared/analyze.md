# /analyze - Analyze Codebase

Analyzes a codebase and creates system architecture documentation.

## Instructions

1. **Run the analysis tool:**
   ```bash
   npx specmind analyze
   ```

2. **Review analysis output** in `.specmind/system/`:

   **⚠️ CRITICAL: Read ALL chunk files for accurate diagrams**

   - `metadata.json`: Overall summary (services, architecture type, databases in `layers.data.databases`, dependencies, violations)
   - `services/{service}/metadata.json`: Service info (type: `frontend`|`api-server`|`worker`|`library`|`unknown`, framework)
   - `services/{service}/{layer}/summary.json` + `chunk-*.json`: Layer details (data, api, service, external)

3. **Read ALL chunk files** for ALL services and layers:
   - `.specmind/system/services/{service}/data-layer/chunk-*.json`
   - `.specmind/system/services/{service}/api-layer/chunk-*.json`
   - `.specmind/system/services/{service}/service-layer/chunk-*.json`
   - `.specmind/system/services/{service}/external-layer/chunk-*.json`

   Chunks contain ALL classes, methods, signatures, and call information needed for diagrams.

4. **Generate `.specmind/system.sm`** with these sections:

   **IMPORTANT: File must start with H1 title:**
   - **# {Project Name} System Architecture** - Use project/repo name as main title (e.g., "Task Manager System Architecture")

   **Global:**
   - **## Overview** - System description
   - **## System Architecture** - Mermaid graph showing services, databases, external systems
     - **### Services** - List each (name, type, framework, purpose)
     - **### Data Stores** - Databases and caches
     - **### External Integrations** - Third-party services
     - **### Communication Patterns** - How services communicate
   - **## Cross-Service Flows** - One sequence diagram per flow:
     - **### {Flow Name} Flow** (e.g., "Create Task Flow")
       - **#### Summary** - What it does
       - **#### Participants** - Services involved
       - **#### Key Operations** - Main operations

   **Per-Service:**
   - **## {service-name} Service** - Overview
   - **### Architecture** - Mermaid graph showing classes/methods by layer
   - **### Architectural Layers** - Describe data, api, service, external layers
   - **### Technology Stack** - Technologies used
   - **### Architecture Violations** - If any

   **Closing:**
   - **## Summary** - Total services, key technologies, patterns, health

5. **Diagram Requirements:**

   **System Architecture (graph TB):**
   - Show ALL detected services with type/framework
   - Include databases from `metadata.json` → `layers.data.databases` array
   - Include external services detected in `external-layer/summary.json`
   - Label cross-service HTTP calls with counts
   - Use brand colors for databases/external: PostgreSQL `#336791`, MySQL `#4479A1`, MongoDB `#47A248`, Redis `#DC382D`, SQLite `#003B57`, Stripe `#635BFF`, AWS `#FF9900`, OpenAI `#10A37F`
   - Use default colors for service nodes (avoid light fills in dark mode)

   **Cross-Service Flows (sequenceDiagram):**
   - ONE diagram per flow (e.g., Create, Update, Delete, etc.)
   - Show complete request/response cycle
   - Include HTTP method/path and method signatures
   - Show database operations (INSERT, UPDATE, SELECT, DELETE)

   **Per-Service Architecture (graph TB):**
   - ONE diagram per service
   - Show ALL classes/methods from chunk files
   - Organize by layers vertically: API → Service → Data → External (top to bottom)
   - Use subgraphs for each layer to ensure vertical stacking:
     ```mermaid
     graph TB
       subgraph API["API Layer"]
         ...
       end
       subgraph Service["Service Layer"]
         ...
       end
       subgraph Data["Data Layer"]
         ...
       end
       subgraph External["External Layer"]
         ...
       end
     ```
   - **IMPORTANT**: Use actual angle brackets `<` and `>` in Mermaid diagrams - they don't need escaping
   - Use double quotes for labels: `TC["ClassName..."]`
   - Show method calls between layers
   - NO fill colors (dark mode)

6. **Create directory:**
   ```bash
   mkdir -p .specmind/features
   ```

7. **Write `.specmind/system.sm`** with all sections and diagrams

8. **Confirm completion**

## Expected Output

`.specmind/system.sm` with comprehensive documentation, AI-generated Mermaid diagrams, service types, dependencies, violations, and technology stack.
