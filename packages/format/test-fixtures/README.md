# Test Fixtures for @specmind/format

This directory contains realistic .sm files used for **end-to-end validation** of the format package.

## Purpose

**Test Fixtures ≠ Unit Tests**

### **Unit Tests** (`src/*.test.ts`)
- **Purpose**: Test individual functions with controlled inputs
- **Scope**: Small, focused test cases for specific functionality
- **Examples**:
  - `slugify("User Auth")` → `"user-auth"`
  - Parse minimal .sm content
  - Validate edge cases and error conditions
- **Speed**: Fast (milliseconds)
- **Coverage**: Code paths, error handling, edge cases

### **Fixture Validation** (`validate-fixtures`)
- **Purpose**: End-to-end validation with realistic, complete .sm files
- **Scope**: Full workflow with complex, real-world content
- **Examples**:
  - Complete feature specifications with all sections
  - Complex Mermaid diagrams with subgraphs
  - Real-world content that users would actually write
- **Speed**: Slower (file I/O, full parsing)
- **Coverage**: Integration, real-world usage patterns

## Fixtures

### `features/user-authentication.sm`
**Complex feature specification including:**
- 8 detailed requirements
- Multi-service architecture diagram with subgraphs
- Design rationale and trade-offs
- Integration points with other services
- Security and optimization notes

**Tests:**
- Parser handles complex Mermaid syntax
- All sections are extracted correctly
- Markdown formatting is preserved
- Roundtrip conversion works (parse → write → identical)

### `system.sm`
**System-level architecture specification:**
- Project overview and technology decisions
- Package relationship diagrams
- Development workflow documentation

**Tests:**
- System vs feature type handling
- Cross-service architecture diagrams
- Technical decision documentation

## Usage

```bash
# Run fixture validation
pnpm validate-fixtures

# Run unit tests
pnpm test

# Run both (recommended before commit)
pnpm test && pnpm validate-fixtures

# Run validation script directly
node test-fixtures/validate-fixtures.mjs
```

## When to Add Fixtures

Add new fixtures when:
- ✅ Testing new .sm file patterns or structures
- ✅ Validating complex Mermaid diagram support
- ✅ Ensuring real-world content works end-to-end
- ✅ Documenting supported .sm file formats

**Don't add fixtures for:**
- ❌ Simple function testing (use unit tests)
- ❌ Error condition testing (use unit tests)
- ❌ Edge cases with malformed input (use unit tests)

## Structure

```
test-fixtures/
├── validate-fixtures.mjs        # Validation script (colocated with data)
├── README.md                     # This documentation
└── .specmind/                    # Mirrors real project structure
    ├── system.sm                 # System architecture
    └── features/
        └── user-authentication.sm   # Feature specification
```

This structure demonstrates how a real SpecMind project would be organized, with the validation script colocated with the fixtures it validates.