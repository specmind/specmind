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

6. **Update system.sm** if system-level changes were made:
   - Add new components to system diagram
   - Document new integration points
   - Update design decisions if patterns evolved

7. **Run tests** (if applicable) and ensure implementation works

## Expected Output

- Implemented code files aligned with the architecture
- Updated .sm file(s) if there were any deviations or learnings
- Confirmation of successful implementation
