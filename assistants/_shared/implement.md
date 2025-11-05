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
   - Review the requirements:
     - **## Requirements** section - what the feature must do (functional, technical, non-functional)
   - Review the change descriptions:
     - **### Impact** (under System Architecture) - what services/data stores/integrations are affected
     - **#### Summary/Participants/Key Operations** (under Cross-Service Flows) - what flows change
     - **#### Affected Layers** (under Service Changes) - what layers/classes/methods change
     - **#### Data Models** (under Service Changes) - what entities change
   - Note all components/interactions marked as Added (green), Modified (orange), or Removed (red)
   - Review design decisions and integration points
   - Check **## Implementation Plan** for phased approach:
     - **### Phase 1/2** - implementation steps
     - **### Testing Strategy** - how to test
     - **### Rollout Plan** - deployment approach

4. **Implement the code** following the feature specification:
   - Implement all requirements from **## Requirements** section
   - Follow the proposed architecture diagram structure
   - Follow implementation phases from **## Implementation Plan**
   - Apply design decisions documented in **## Design Decisions**
   - Create necessary integration points from **## Integration Points**
   - Add appropriate error handling and validation
   - Implement testing strategy from the plan

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
      - **### {Flow Name} Flow** (for each new or modified flow):
        - **Add new sequence diagram** for new flows (copy from feature .sm file)
        - **Update existing sequence diagram** if flow is modified (add new steps, participants, or data)
        - **#### Summary**: Brief description of what this flow does
        - **#### Participants**: List of services involved in this flow
        - **#### Key Operations**: Main operations performed in this flow
      - Keep unchanged flows as-is

   d) **## {service-name}** sections (for EACH affected service):
      - **Update ### Architecture** diagram to include new/modified components
        - Add new controllers, services, repositories to the Mermaid graph
        - Add new connections between components
        - Remove color coding (green/yellow/red) - system.sm shows current state only
      - **Update ### Architectural Layers** subsection:
        - Add new methods/endpoints to existing classes
        - Add new classes with their methods
        - Update file counts (e.g., "API Layer (3 files)" instead of "API Layer (2 files)")
      - **Update ### Data Models** subsection (if feature affects entities):
        - Update ER diagram to reflect new entities, fields, or relationships
        - Add/remove entities as needed
        - Update relationships between entities
        - Only include this section if entities exist in the service's data layer
      - **Update ### Technology Stack** if new technologies added
      - **Update ### Architecture Violations** if new violations introduced or existing ones fixed
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
   - [ ] ## Overview section reflects new services and technologies
   - [ ] ## System Architecture diagram shows all new/modified services, databases, external systems
   - [ ] ### Services, ### Data Stores, ### External Integrations, ### Communication Patterns subsections updated
   - [ ] All new cross-service flows appear in ## Cross-Service Flows with ### {Flow} subsections
   - [ ] Each flow has #### Summary, #### Participants, #### Key Operations subsections
   - [ ] All modified flows have been updated with new steps/participants
   - [ ] All affected ## {service-name} sections updated:
     - [ ] ### Architecture diagram shows new/modified components
     - [ ] ### Architectural Layers describes new methods and classes
     - [ ] ### Data Models (if applicable) shows entity changes
     - [ ] ### Technology Stack reflects new technologies
     - [ ] ### Architecture Violations updated if violations changed
   - [ ] ## Summary section reflects updated service counts, technologies, and patterns
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
