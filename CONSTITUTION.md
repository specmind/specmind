# SpecMind Constitution

This document defines the core architectural decisions, principles, and constraints for the SpecMind project. All code, features, and decisions must align with this constitution.

**Last Updated:** 2025-11-05
**Version:** 1.13.1

## Changelog
- **v1.13.1** (2025-11-05): Implemented entity chunking to prevent token limit errors. Large entity datasets now split into separate `entities-chunk-*.json` files (~18K tokens each, well under 25K Claude limit). Entity data moved from inline in `summary.json` to separate chunk files. Summary now contains `totalEntities`, `totalEntityChunks`, and `entityChunkManifest` metadata. Uses tiktoken cl100k_base encoding for accurate token counting. AI assistants read all entity chunks during `/analyze` to generate complete ER diagrams. Follows same chunking pattern as code files for consistency.
- **v1.13.0** (2025-11-03): Added entity detection for database ORM models integrated with data layer analysis. Uses pattern-based detection (matching ORM imports from data-layer.json) to identify entity files, then tree-sitter for AST parsing. Supports TypeScript (TypeORM, MikroORM, Sequelize) and Python (Django ORM, SQLAlchemy, Pydantic). Entity metadata (name, table name, fields, relationships, framework) saved in data layer summary (`services/{service}/data-layer/summary.json`). AI reads entities from summary during `/analyze` and generates Mermaid ER diagrams with PK/UK/FK markers and relationships (1:N, N:1, N:M, 1:1). Optional "### Data Models" subsection in per-service sections when entities detected. Follows pattern-driven architecture and v1.12.0 principle: detection in code, diagram generation in AI prompts.
- **v1.12.0** (2025-10-26): Removed automatic diagram generation from analysis. AI assistants now generate diagrams from analyzed JSON data during `/analyze` command execution. Changed chunking from byte-based (256KB) to token-based (~20K tokens, well under 25K Claude limit). This ensures all chunk files can be read by AI without hitting token limits. AI generates three types of diagrams: System Architecture (global view with brand colors for databases/external services), Per-Service Architecture (one diagram per service showing all classes/methods by layer), and Cross-Service Flows (sequence diagrams). Diagram generation moved from code to AI prompts for better flexibility and accuracy.
- **v1.11.0** (2025-10-24): Enhanced diagram generation with per-service architecture diagrams. Each service now gets its own `architecture-diagram.sm` showing function-level call graphs grouped by layer. Root-level `sequence-diagram.sm` shows cross-service interactions. Diagrams now show actual functions/methods with arrows indicating dependencies, not just high-level layers. Provides detailed visibility into internal service architecture and cross-service communication patterns.
- **v1.10.0** (2025-10-24): Added automatic diagram generation to split analysis. Analysis now generates separate diagram files: `.specmind/system/architecture-diagram.sm` (component diagram showing services, layers, databases with brand colors) and `.specmind/system/sequence-diagram.sm` (request flow through layers). Diagrams use database cylinder notation and brand colors from `databases.json` pattern config. LLM workflows now use pre-generated diagrams instead of manually creating them from JSON data.
- **v1.9.0** (2025-10-24): Enhanced split analysis with chunking to handle very large codebases. Layer files now chunked at ~20K tokens (minified) with summary files. Renamed output directory from `.specmind/analysis/` to `.specmind/system/`. Removed redundant `layers/` directory. Cross-service dependencies stored in root metadata, cross-layer dependencies stored in service metadata. Each layer now has `summary.json` (pretty-printed) and `chunk-N.json` files (minified).
- **v1.8.0** (2025-10-23): Introduced split analysis architecture to handle large codebases. Analysis automatically splits output into services and architectural layers (data/api/service/external). Hardcoded pattern-based detection with JSON configuration files for 180+ packages/tools. Cross-layer dependency tracking with architecture violation detection. Supports multi-service (monorepo) and single-service (monolith) detection. Enhanced data layer with database type detection (PostgreSQL, MySQL, Redis, MongoDB), API layer with endpoint extraction, external layer with message queue detection (RabbitMQ, Kafka, SQS, Celery, Bull).
- **v1.7.0** (2025-10-19): Implemented Python language support with language-specific extractor architecture. Added tree-sitter-python integration. Refactored extractors from generic (with conditionals) to language-specific implementations (typescript.ts, javascript.ts, python.ts) following "duplication is cheaper than wrong abstraction" principle. Python now fully supported for .py and .pyi files.
- **v1.6.0** (2025-10-19): Enhanced `/design` and `/implement` workflow with color-coded architectural changes. Feature .sm files now show system-wide diagrams with green (added), yellow (modified), red (removed) components. Added system.changelog file to track architectural evolution. Implemented function/method call tracking for accurate sequence diagrams. Standardized two-diagram requirement across all .sm files.
- **v1.5.0** (2025-10-18): Renamed `/init` to `/analyze` to avoid conflicts. Setup command now inlines `_shared` prompt templates into slash command files for self-contained distribution. Updated VS Code extension to use esbuild bundling.
- **v1.4.0** (2025-10-18): Standardized testing structure - all packages use `src/__tests__/` for test files, vitest v3.2.4+, 80%+ coverage requirement. Added comprehensive testing guidelines in Section 6.4.
- **v1.3.0** (2025-10-16): Added README sync rule - all user-facing changes in CONSTITUTION.md must be reflected in README.md. Created comprehensive README aligned with constitution.
- **v1.2.0** (2025-10-16): Defined file naming convention - `system.sm` for root, kebab-case slugified names for features. No timestamps in filenames, git history for versioning.
- **v1.1.0** (2025-10-16): Updated .sm file format to include both markdown documentation and architecture diagrams (not just diagrams). Added file organization structure and one-file-per-feature principle.
- **v1.0.0** (2025-10-16): Initial constitution established

---

## 1. Project Vision

**Mission:** Create a developer experience where architecture evolves with code, not after it — turning every feature into a visual, validated, and optimized design.

**Core Workflow:** Spec-driven vibe coding where architecture and implementation stay in sync from the very first commit.

**Problem Statement:** AI-assisted coding enables rapid development but introduces new challenges: team members can easily generate conflicting architectures, code reviews of AI-generated output are difficult, and architectural inconsistencies compound quickly. Traditional documentation-after-code approaches fail in this environment. SpecMind solves this by making architecture review happen *before* implementation, maintaining consistency across teams through shared, validated .sm specifications.

---

## 2. Architectural Decisions

### 2.1 Monorepo Structure

**Decision:** Single monorepo containing all packages (core, format, CLI, VS Code extension)

**Rationale:**
- Shared code reuse (especially .sm format parser/renderer)
- Version synchronization across packages
- Atomic updates when format evolves
- Single place for issues and contributions
- Easier coordination of breaking changes

**Tool:** pnpm workspaces

### 2.2 Programming Language

**Decision:** Full TypeScript stack for all packages

**Rationale:**
- VS Code extension requires TypeScript/JavaScript
- Single language simplifies contributions and maintenance
- Excellent ecosystem for LLM integration (@anthropic-ai/sdk, openai)
- Type sharing across all packages
- Simple distribution (single npm install)
- Great developer experience with modern tooling

**Stack:**
- TypeScript 5.x+
- Node.js 20+ runtime
- ES Modules (ESM)

### 2.3 Code Analysis & Parsing

**Decision:** Use tree-sitter for all code analysis and parsing

**Rationale:**
- Multi-language support (50+ languages) out of the box
- Same parser VS Code uses - battle-tested and fast
- Incremental parsing for performance
- Excellent TypeScript bindings
- Can parse files, classes, modules, functions, and extract relationships
- Unified approach across all supported languages

**Analysis Capabilities:**
- Extract all files, classes, modules, functions
- Identify relationships and dependencies between components
- Build component graphs
- Support for TypeScript/JavaScript (implemented) and Python (implemented)
- Extensible to Go, Rust, Java, C#, and 50+ other languages

---

## 3. Package Architecture

### 3.1 Package Boundaries

```
specmind/
├── assistants/         # AI assistant integrations
│   ├── _shared/        # Shared prompt templates (inlined during setup)
│   │   ├── analyze.md
│   │   ├── design.md
│   │   └── implement.md
│   ├── claude-code/
│   ├── cursor/
│   ├── windsurf/
│   └── copilot/
├── packages/
│   ├── core/       # @specmind/core - Pure analysis logic
│   ├── format/     # @specmind/format - .sm file format
│   ├── cli/        # specmind - CLI wrapper + setup command
│   └── vscode/     # VS Code extension (viewer only)
```

### 3.2 Package Responsibilities

#### @specmind/core
- Code analysis using tree-sitter
- Architecture diagram generation
- Architecture diffing
- **Pure library** - no CLI interface, no dependencies on I/O
- Exports clean, typed API

**Key Modules:**
- `analyzer/` - Tree-sitter based code analysis
  - Extracts functions, classes, imports, exports
  - **Call tracking** - Extracts function/method call expressions for sequence diagrams
  - Builds function context maps to track caller-callee relationships
- `generator/` - Architecture diagram generation
  - Component/dependency diagrams
  - **Sequence diagrams** - Uses call data to show actual execution flow
  - Class diagrams
- `differ/` - Architecture diffing logic

#### @specmind/format
- Extract Mermaid diagrams from markdown
- Parse markdown content
- Validate: markdown + at least one Mermaid diagram
- Utilities for rendering
- **No rigid schema** - flexible structure
- **Standalone package** - can be used independently

#### specmind (CLI)
- **Thin wrapper** around `@specmind/core`
- **Two modes:**
  1. **Setup mode** - `npx specmind setup <assistant>` - Copies slash commands to user's project
  2. **Analysis mode** - `npx specmind analyze` - Invoked by AI assistants via bash, outputs split analysis
- Commands: `setup`, `analyze`
- Example: `npx specmind analyze` or `npx specmind analyze -o ./custom/path`
- Future commands: `diff`, `validate`

#### vscode (VS Code Extension)
- .sm file viewer with visual rendering
- Syntax highlighting for .sm files
- Webview panel for diagram visualization
- **Read-only viewer** - does not execute slash commands

### 3.3 Dependency Rules

```
vscode → format (required for rendering)

cli → core (required)
cli → format (required)

core → format (required for .sm file operations)

format → (no internal dependencies)
```

**Note:**
- Slash commands are self-contained - `setup` inlines `_shared` prompt templates into command files
- When executed by AI assistants, slash commands invoke the CLI via bash commands
- The CLI outputs JSON which the LLM uses to generate documentation

### 3.4 Installation & Setup

**User Installation Flow:**

1. **Install CLI globally** (optional, can use npx)
   ```bash
   npm install -g specmind
   ```

2. **Run setup for your AI assistant**
   ```bash
   # Interactive mode - choose assistant(s)
   npx specmind setup

   # Or specify assistant directly
   npx specmind setup claude-code
   npx specmind setup cursor

   # Or multiple at once
   npx specmind setup claude-code cursor
   ```

3. **Setup command copies files to project:**
   - `claude-code`: Copies `assistants/claude-code/.claude/` → `.claude/`
   - `cursor`: Copies `assistants/cursor/.cursorrules` → `.cursorrules`
   - `windsurf`: Copies `assistants/windsurf/.windsurf/` → `.windsurf/`
   - `copilot`: Copies `assistants/copilot/instructions/` → `.github/copilot/`

4. **Start using slash commands** in your AI assistant

**Prompt Template Architecture:**
- `assistants/_shared/` contains shared prompt logic (single source of truth)
- `assistants/{name}/` contains assistant-specific wrappers that reference shared prompts
- Each assistant folder shows how to integrate prompts into that specific tool

---

## 4. Core Features

### 4.1 Slash Commands

Primary interface for AI coding assistants. Each assistant requires its own slash command implementation.

**Supported AI Assistants:**
- ✅ **Claude Code** - Supported (via `.claude/commands/`)
- ✅ **Windsurf** - Supported (via `.windsurf/workflows/` Cascade workflows)
- 🚧 **Cursor** - Coming Soon (via `.cursorrules` + custom commands)
- 🚧 **GitHub Copilot** - Coming Soon (via `#file` references)

**Core Commands:**

#### `/analyze`
- Slash command that orchestrates system initialization and codebase analysis
- LLM executes: `npx specmind analyze`
- CLI wrapper calls `@specmind/core` to analyze codebase with tree-sitter

**Analysis Output:**
- Automatically splits large codebases into smaller, LLM-friendly chunks
- Detects services (monorepo vs monolith) and categorizes files by architectural layer
- Outputs to `.specmind/system/` directory structure:
  - `metadata.json` - Root metadata with cross-service dependencies
  - `system.sm` - AI-generated documentation with up to four diagram types (generated by AI during `/analyze`)
  - `services/{service}/metadata.json` - Service metadata with cross-layer dependencies
  - `services/{service}/{layer}/summary.json` - Layer summary (pretty-printed, <50KB) with entities in data layer
  - `services/{service}/{layer}/chunk-N.json` - Chunked file analysis (minified, ~20K tokens)
- Four layer types: **data** (database interactions), **api** (endpoints/routes), **service** (business logic), **external** (third-party integrations)
- Detects 180+ frameworks, ORMs, databases, SDKs, and message queues
- **Entity detection** for TypeScript (TypeORM, MikroORM, Sequelize) and Python (Django ORM, SQLAlchemy, Pydantic) via pattern matching + tree-sitter
- Tracks cross-service and cross-layer dependencies for architecture validation
- **AI generates system.sm** with up to four diagram types:
  - System Architecture - Global view with brand colors for databases/external services
  - Per-Service Architecture - One diagram per service showing all classes/methods by layer
  - Cross-Service Flows - Sequence diagrams showing complete request/response cycles
  - Entity-Relationship (ER) Diagrams - Database schema visualization (optional, from data layer summary)
- See [ANALYSIS_SPLIT_SPEC.md](./docs/ANALYSIS_SPLIT_SPEC.md) for complete specification

#### `/design <feature-name>`
- LLM analyzes existing code and user intent for new feature
- Extracts feature name from user input (handles both simple names and long-form descriptions)
- Slugifies feature name (e.g., "User Auth" → "user-auth")
- LLM generates feature specification with:
  - Feature overview and requirements (markdown)
  - **Two Mermaid diagrams showing SYSTEM with feature integrated:**
    1. System Component/Dependency graph with color-coded changes
    2. System Sequence diagram showing feature flow through system
  - **Color coding in diagrams:**
    - 🟢 Green: New components/interactions (fill:#90EE90)
    - 🔴 Red: Components/interactions to remove (fill:#FFB6C1)
    - 🟡 Yellow: Components/interactions to modify (fill:#FFEB99)
  - **Architectural Impact sections** (one per diagram):
    - Lists what will be Added/Modified/Removed
    - Documents new dependencies created
  - Design decisions and rationale
  - Integration points with existing system
- Creates/updates `.specmind/features/{slugified-name}.sm`
- **Does NOT update system.sm** (only proposes changes via color-coded diagrams)

#### `/implement <feature-name>`
- Reads `.specmind/features/{slugified-name}.sm` for context
- Reviews Architectural Impact sections to understand changes to make
- LLM implements code aligned with documented architecture
- Ensures structural and intent alignment
- LLM updates the feature .sm file if implementation diverges from design
- LLM adds notes/warnings to .sm file based on implementation learnings
- **Updates `.specmind/system.sm`** with actual implemented changes:
  - Updates both diagrams (Component/Dependency + Sequence)
  - Removes color coding (system.sm shows current state, not proposed changes)
  - Applies changes: add new components, modify existing, remove deprecated
- **Appends to `.specmind/system.changelog`**:
  - Dated entry documenting what changed
  - Format: Added/Modified/Removed sections + Notes
  - Keeps system.sm clean while preserving change history

### 4.2 .sm File Format

**Decision:** Feature specification files with .sm extension containing markdown documentation and architecture diagrams

**Format:** Flexible markdown files with embedded Mermaid diagrams

**Core Requirements:**
1. **Markdown** - Any structure, any sections (developers can customize)
2. **Two Mermaid diagrams** - Architecture visualization:
   - Component/Dependency graph (structural view)
   - Sequence diagram (behavioral/flow view)

**Recommended Structure (not enforced):**

The shared prompts suggest this structure as a best practice, but developers can modify:

**For Feature .sm Files:**
1. **Feature Name** (H1 heading: `# Feature Name`)
2. **Overview** - High-level description
3. **Requirements** - Functional/technical requirements
4. **Architecture** - Mermaid diagram(s) showing system structure
5. **Design Decisions** - Rationale and reasoning behind choices
6. **Integration Points** - Connections to other parts
7. **Notes** - Additional context, warnings, optimizations

**For system.sm Files (generated by `/analyze`):**
1. **# {Project Name} System Architecture** - H1 title with project name
2. **## Overview** - System description
3. **## System Architecture** - Global architecture diagram with services/databases/external systems
   - **### Services** - List each service (name, type, framework, purpose)
   - **### Data Stores** - Databases and caches
   - **### External Integrations** - Third-party services
   - **### Communication Patterns** - How services communicate
4. **## Cross-Service Flows** - Sequence diagrams for key flows
   - One subsection per flow (e.g., "### Create Task Flow")
5. **## {service-name} Service** - Per-service sections with architecture diagram and layer descriptions
   - **### Architecture** - Service-level diagram showing classes/methods by layer
   - **### Architectural Layers** - Description of data, api, service, external layers
   - **### Data Models** (OPTIONAL) - ER diagrams if entities detected in this service
     - Shows database schema with entities, fields (PK/UK/FK), and relationships
     - One ER diagram per service with detected ORM entities
   - **### Technology Stack** - Technologies used
   - **### Architecture Violations** - If any
6. **## Summary** - Overall system summary

**Flexibility:**
- Developers can modify prompts to use different sections
- Add custom sections as needed
- Multiple Mermaid diagrams are supported
- No schema validation on section structure

**Example:**
````markdown
# User Authentication

## Overview
Secure user authentication with JWT tokens, supporting email/password and OAuth providers.

## Requirements
- Secure password hashing (bcrypt)
- JWT token generation and validation
- OAuth 2.0 integration
- Session management

## Architecture

### Component Diagram
```mermaid
graph TD
    Client[Client App] --> AuthAPI[Auth API]
    AuthAPI --> AuthService[Auth Service]
    AuthService --> UserDB[(User Database)]
    AuthService --> TokenService[JWT Token Service]
    AuthService --> OAuthService[OAuth Service]
    OAuthService --> GoogleAuth[Google OAuth]
    OAuthService --> GitHubAuth[GitHub OAuth]
    TokenService --> Redis[(Redis Cache)]
```

### Sequence Diagram
```mermaid
sequenceDiagram
    participant Client
    participant AuthAPI
    participant AuthService
    participant TokenService
    participant UserDB

    Client->>AuthAPI: POST /auth/login
    AuthAPI->>AuthService: validateCredentials(email, password)
    AuthService->>UserDB: findUser(email)
    UserDB-->>AuthService: user
    AuthService->>AuthService: verifyPassword(password, hash)
    AuthService->>TokenService: generateToken(userId)
    TokenService-->>AuthService: JWT token
    AuthService-->>AuthAPI: token
    AuthAPI-->>Client: { token, user }
```

## Design Decisions
### Why JWT over sessions?
- Stateless authentication for horizontal scaling
- Better for microservices architecture
- Mobile app support

## Integration Points
- **User Service**: Validates user credentials
- **Email Service**: Sends password reset emails
- **Logging Service**: Audit trail for auth events

## Notes
⚠️ **Security**: Ensure HTTPS in production
💡 **Optimization**: Consider refresh token rotation
````

**Storage Location:** `.specmind/` folder in repository root

**File Organization:**
```
.specmind/
├── system.sm               # Root system architecture (generated by /analyze)
├── features/
│   ├── user-auth.sm       # Feature: User Authentication
│   ├── payment-flow.sm    # Feature: Payment Processing
│   └── analytics-dashboard.sm  # Feature: Analytics Dashboard
└── services/              # (Future: microservices)
    ├── api-gateway.sm
    └── user-service.sm
```

**Naming Convention:**

**Root File:**
- **`system.sm`** - Generated by `/analyze` command
- Contains system-level architecture overview
- Single file per repository

**Feature Files:**
- **Location:** `.specmind/features/{feature-name}.sm`
- **Format:** Kebab-case, lowercase, slugified from feature name
- **Examples:**
  - `"User Authentication"` → `user-authentication.sm`
  - `"Payment Flow"` → `payment-flow.sm`
  - `"Real-time Notifications"` → `real-time-notifications.sm`

**Naming Rules:**
1. Convert to lowercase
2. Replace spaces and special characters with hyphens (`-`)
3. Remove leading/trailing hyphens
4. Use descriptive, meaningful names
5. No timestamps in filename (use git history for versioning)

**File Lifecycle:**
- `/analyze` creates `system.sm`
- `/design "Feature Name"` creates `features/feature-name.sm`
- Subsequent `/design "Feature Name"` updates the same file
- Git history tracks all changes and evolution
- Manual rename if feature name changes significantly

**One .sm file per feature:**
- Each feature gets its own .sm file
- File contains complete context: description + diagram + decisions
- Easy to understand feature architecture at a glance
- Self-documenting - reduces need for external docs
- Traceable evolution through git history

**Features:**
- Human-readable and git-friendly
- Visual rendering in VS Code (markdown + diagram)
- Support for annotations (warnings, optimization tips, duplication alerts)
- Versioned alongside code
- Searchable documentation + architecture in one place
- Can be used in code reviews and design discussions
- Rich context for LLMs when implementing features

---

## 5. User Interfaces

### 5.1 Slash Commands
- Each AI assistant has its own slash command implementation
- Commands invoke `@specmind/core` APIs
- `/analyze`, `/design`, `/implement` commands
- See Section 4.1 for supported assistants

### 5.2 VS Code Extension
- Visual feedback and diagram rendering
- Syntax highlighting for .sm files
- Webview panel for interactive diagrams

---

## 6. Technical Principles

### 6.1 Code Analysis

**Tree-sitter First:**
- All code parsing uses tree-sitter
- Language-specific analyzers extend base analyzer
- Extract: files, classes, modules, functions, imports, exports
- Build relationship graphs between components

**Multi-language Support:**

Currently Supported:
- TypeScript/JavaScript (via tree-sitter-typescript) ✅
- Python (via tree-sitter-python) ✅

Planned:
- Go (via tree-sitter-go)
- Rust (via tree-sitter-rust)
- C#, Java, C++
- Extensible to 50+ languages via tree-sitter

### 6.2 LLM Integration

**Strategy:** Core logic generates prompts, LLMs provide insights

**Supported Providers:**
- Anthropic (Claude)
- OpenAI (GPT-4)
- Extensible to other providers

**Usage:**
- Architecture generation (analyzing component relationships)
- Design suggestions (proposing improvements)
- Code generation (implementing aligned with architecture)

### 6.3 Type Safety

- Zod schemas for runtime validation
- TypeScript types generated from Zod schemas
- Shared types across all packages
- Strict TypeScript configuration

### 6.4 Testing

**Testing Framework:** Vitest (v3.2.4+) for all packages

**Test Organization:**
- **Location:** `src/__tests__/` directory for all test files
- **Naming:** `*.test.ts` for unit tests
- **Coverage:** Minimum 80% code coverage required
- **Fixtures:** `test-fixtures/` directory for realistic test data

**Test Structure:**
```
packages/{package}/
├── src/
│   ├── __tests__/           # All test files here
│   │   ├── parser.test.ts
│   │   ├── utils.test.ts
│   │   └── fixtures/        # Optional test fixtures
│   ├── parser.ts            # Source code
│   └── utils.ts
├── test-fixtures/           # End-to-end test fixtures
└── scripts/
    └── validate-*.mjs       # Validation scripts
```

**Test Types:**
- **Unit tests** (`src/__tests__/*.test.ts`) - Fast, isolated tests for individual functions
- **Integration tests** (`src/__tests__/*.test.ts`) - Test module interactions
- **Fixture validation** (`scripts/validate-*.mjs`) - Real-world scenario tests with actual files

**Coverage Requirements:**
- Lines: 80%+
- Functions: 80%+
- Branches: 80%+
- Statements: 80%+

**Configuration:**
- `vitest.config.ts` in each package
- Exclude `__tests__/`, `test-fixtures/`, and type definitions from coverage
- Use `v8` coverage provider for accuracy

---

## 7. Future Scope

### 7.1 Split Analysis Architecture (✅ Implemented)

**Status:** Fully implemented and tested.

**Problem:** Large codebases (300+ files) produce analysis output too large for LLM context windows

**Solution:** Automatically split analysis by services and architectural layers

**Key Features:**
- **Service Detection:** Monorepo structure detection, entry points, Docker compose, package.json
- **Layer Categorization:** data/api/service/external with pattern-based detection
- **Configuration-Driven:** JSON files for detection patterns (180+ packages/tools)
- **Cross-Layer Dependencies:** Track relationships between layers, detect architecture violations
- **Database Type Detection:** Maps ORMs/drivers to specific databases (PostgreSQL, MySQL, Redis, MongoDB)
- **API Endpoint Extraction:** Method, path, handler, framework detection for 32 frameworks
- **Message Queue Detection:** RabbitMQ, Kafka, SQS, Celery, Bull, and 20+ more
- **Language Support:** TypeScript, JavaScript, Python, with Go/Java/C# planned

**Output Structure:**
```
.specmind/system/
├── metadata.json                  # Cross-service dependencies
└── services/{service}/
    ├── metadata.json              # Cross-layer dependencies
    └── {layer}/
        ├── summary.json           # Layer metadata (<50KB, pretty)
        └── chunk-N.json           # File analysis (~20K tokens, minified)
```

**Chunking Strategy:**
- Layer files split at ~20K tokens (~80KB) to fit in LLM context windows (well under 25K token limit)
- Summary files pretty-printed for readability
- Chunk files minified to maximize data density
- Same-layer deps in chunks, cross-layer deps in service metadata

**Detection Coverage:**
- 27 ORMs (Prisma, TypeORM, SQLAlchemy, Mongoose, etc.)
- 28 database drivers
- 32 API frameworks (Express, NestJS, FastAPI, Flask, etc.)
- 18 HTTP clients
- 100+ external service SDKs (AWS, Stripe, OpenAI, Twilio, etc.)
- 25 message queue systems

**Rationale:** Hardcoded pattern matching (vs LLM-based detection) for speed, cost-effectiveness, and deterministic results

### 7.2 Multi-Service Architectures
- Service-oriented architecture analysis (partially addressed by split analysis)
- Microservice architecture diagrams
- Service interaction optimization
- Client/server and front-end/back-end visualization

### 7.3 GitHub Integration
- Visual architecture diffs in PRs
- Inline notes and optimization feedback
- Architecture review bot
- Breaking change detection

### 7.4 Advanced Analysis
- Performance bottleneck detection
- Code duplication identification
- Security pattern analysis
- Dependency optimization

---

## 8. Non-Negotiables

### 8.1 What We MUST Do

1. **Use tree-sitter** for all code analysis and parsing
2. **Full TypeScript stack** - no mixing languages
3. **Monorepo structure** - all packages in one repo
4. **Slash commands first** - primary user interface
5. **.sm files = markdown + diagrams** - rich feature specifications, not just diagrams
6. **One .sm file per feature** - complete context in single file
7. **Core is pure logic** - no CLI/UI dependencies
8. **Type-safe everything** - Zod + TypeScript
9. **Multi-language support** - not just TypeScript/JavaScript

### 8.2 What We MUST NOT Do

1. **No Python in core logic** - TypeScript only
2. **No tight coupling** between packages - clean boundaries
3. **No breaking .sm format** without migration path
4. **No proprietary formats** - keep everything open and readable
5. **No diagram-only .sm files** - must include markdown documentation
6. **No heavy VS Code dependencies in core** - keep portable
7. **No manual AST parsing** - always use tree-sitter

---

## 9. Development Workflow

### 9.1 Branching Strategy
- `main` - stable releases
- `develop` - integration branch
- Feature branches from `develop`

### 9.2 Release Strategy
- Independent versioning per package
- Changesets for changelog generation
- GitHub Actions for CI/CD
- npm publish for all packages

### 9.3 Documentation
- JSDoc for all public APIs
- README in each package
- Examples in `/examples` folder
- Comprehensive docs in `/docs`

### 9.4 README Sync Rule
**IMPORTANT:** The root README.md must stay aligned with CONSTITUTION.md

**Requirement:** Any major architectural decision added to CONSTITUTION.md must be reflected in README.md if user-facing

**Examples of changes requiring README update:**
- New core features or commands
- Changes to .sm file format
- New technology stack decisions
- Modified workflow or philosophy
- Package structure changes

**Examples NOT requiring README update:**
- Internal implementation details
- Development workflow changes
- Testing strategy updates
- Release process changes

**Process:**
1. Update CONSTITUTION.md first (source of truth)
2. Determine if change is user-facing
3. If yes, update README.md accordingly
4. Both updates should be in same commit/PR

---

## 10. Success Metrics

**Developer Adoption:**
- GitHub stars and forks
- npm downloads
- VS Code extension installs

**Quality Metrics:**
- Test coverage > 80%
- Zero tolerance for type errors
- Performance benchmarks for analysis

**Community:**
- Active contributors
- Issue resolution time
- Documentation quality

---

## Amendment Process

This constitution can be amended when:
1. A significant architectural decision is made
2. A new principle or constraint is established
3. A previous decision is reversed with rationale

All amendments must:
- Be discussed in GitHub issues
- Have clear rationale documented
- Update this document with version bump
- Communicate to contributors

---

**Signatures:**

- **Architecture Owner:** [To be filled]
- **Tech Lead:** [To be filled]
- **Date Established:** 2025-10-16
