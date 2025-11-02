# /implement - Implement a feature

This prompt template contains the core logic for the `/implement <feature-name>` command that implements code based on a feature specification.

## Instructions

1. **Get the feature name** from the command argument (e.g., `/implement "User Authentication"`)

2. **Slugify the feature name** to find the .sm file:
   ```
   "User Authentication" → ".specmind/features/user-authentication.sm"
   ```

3. **Read the feature specification** from `.specmind/features/{slugified-name}.sm`
   - Parse the markdown documentation
   - Extract the Mermaid diagram(s) to understand the architecture
   - Review the **Architectural Impact** sections to understand what changes to make
   - Note all components/interactions marked as Added (green), Modified (yellow), or Removed (red)
   - Review any design decisions or requirements

4. **Implement the code** following the architecture in the .sm file:
   - Follow the proposed architecture diagram structure
   - Implement requirements and decisions documented
   - Create necessary integration points
   - Add appropriate error handling and validation

5. **Update the .sm file** if implementation diverges from the design:
   - Document why changes were made
   - Update the architecture diagram if structure changed
   - Add notes about implementation learnings
   - Add warnings or optimization opportunities discovered

6. **Update system.sm** based on the actual implementation:
   - Read the current `.specmind/system.sm` file
   - **CRITICAL: You MUST update ALL affected sections in detail, not just the overview**

   **Update these sections comprehensively:**

   a) **## Overview** section:
      - Update service list if new services added
      - Update architecture type if changed
      - Update technology stack list

   b) **## System Architecture** section:
      - Update main architecture Mermaid diagram (add/modify/remove services, databases, external systems)
      - Update **### Services** subsection with new/modified service descriptions
      - Update **### Data Stores** subsection with new databases/tables/columns
      - Update **### External Integrations** subsection with new external services
      - Update **### Communication Patterns** subsection with new service-to-service interactions

   c) **## Cross-Service Flows** section:
      - **Add new sequence diagrams** for new flows introduced by this feature (copy from feature .sm file)
      - **Update existing sequence diagrams** that are affected by this feature (add new steps, participants, or data)
      - Each flow should be a complete sequence diagram showing the end-to-end interaction
      - Keep unchanged flows as-is

   d) **## {service-name}** sections (for EACH affected service):
      - **Update the service architecture diagram** to include new/modified components
        - Add new controllers, services, repositories to the Mermaid graph
        - Add new connections between components
        - Remove color coding (green/yellow/red) - system.sm shows current state only
      - **Update ### Layers** subsection:
        - Add new methods/endpoints to existing classes
        - Add new classes with their methods
        - Update file counts (e.g., "API Layer (3 files)" instead of "API Layer (2 files)")
      - **Update ### Technology Stack** if new technologies added
      - **Add new ## {service-name}** section if this feature introduces a new service (copy structure from feature .sm)

   e) **## Summary** section:
      - Update service count if new services added
      - Update technology summary
      - Add any new architectural patterns introduced

   - **Cross-reference the feature .sm file** and ensure ALL changes documented there are reflected in system.sm:
     - Components marked green (added) in feature .sm → must appear in system.sm
     - Components marked yellow (modified) in feature .sm → must be updated in system.sm
     - Components marked red (removed) in feature .sm → must be removed from system.sm
     - New flows in feature .sm → must be added to system.sm Cross-Service Flows
     - Modified flows in feature .sm → must update corresponding flows in system.sm

7. **Append to system.changelog**:
   - Create `.specmind/system.changelog` if it doesn't exist
   - Add a new entry with today's date and the feature name
   - Document the changes in this format:
     ```markdown
     ## YYYY-MM-DD - [Feature Name]

     **Added:**
     - Component/interaction 1
     - Component/interaction 2

     **Modified:**
     - Component/interaction 1: description of change
     - Component/interaction 2: description of change

     **Removed:**
     - Component/interaction 1

     **Notes:**
     - Any important context or rationale
     ```

8. **Run tests** (if applicable) and ensure implementation works

9. **Verify system.sm updates are complete** by checking:
   - [ ] All new services from feature .sm appear in system.sm with their own ## {service-name} sections
   - [ ] All new cross-service flows from feature .sm appear in system.sm ## Cross-Service Flows
   - [ ] All modified flows in feature .sm have been updated in system.sm
   - [ ] All service architecture diagrams show new/modified components (controllers, services, repositories)
   - [ ] All service layer descriptions list new methods and classes
   - [ ] The main System Architecture diagram reflects all new services and connections
   - [ ] Summary section reflects updated service counts and technologies
   - If any of these checks fail, go back and complete the missing updates

## Expected Output

- Implemented code files aligned with the architecture
- Updated feature .sm file if there were any deviations or learnings
- **Fully updated** `.specmind/system.sm` with:
  - All new services documented with complete architecture diagrams and layer descriptions
  - All new cross-service flows added as sequence diagrams
  - All modified flows updated with new steps/participants
  - All affected service sections updated with new components and methods
  - Updated summary with new service counts
  - Color coding removed (system.sm shows current state, not diffs)
- New entry in `.specmind/system.changelog` documenting what changed
- Confirmation of successful implementation
