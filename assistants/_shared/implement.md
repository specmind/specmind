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
   - Update **both diagrams** (Component/Dependency graph AND Sequence diagram) to reflect the implemented changes
   - Apply the architectural changes documented in the feature .sm file:
     - Add new components (that were marked green in feature design)
     - Modify existing components (that were marked yellow in feature design)
     - Remove deprecated components (that were marked red in feature design)
   - Remove color coding from system.sm diagrams (system.sm shows current state, not changes)
   - Update any relevant documentation sections in system.sm

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

## Expected Output

- Implemented code files aligned with the architecture
- Updated feature .sm file if there were any deviations or learnings
- Updated `.specmind/system.sm` with the new architecture (color coding removed)
- New entry in `.specmind/system.changelog` documenting what changed
- Confirmation of successful implementation
