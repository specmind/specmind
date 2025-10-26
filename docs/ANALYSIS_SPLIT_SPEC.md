# Analysis Split Specification

> **TL;DR:** `specmind analyze` automatically detects services, splits files by architectural layers (data/api/service/external), and tracks dependencies. Outputs to `.specmind/system/`. Supports TypeScript, JavaScript, and Python.

**Current Status:**
- ✅ Multi-service detection (monorepo, Docker Compose, entry points)
- ✅ Layer detection: data/api/service/external
- ✅ Cross-layer dependency tracking (with absolute path resolution)
- ✅ Cross-service dependency tracking (HTTP calls + imports)
- ✅ Database type detection
- ✅ API endpoint extraction
- ✅ Message queue detection
- ✅ Architecture violation detection
- ✅ Pattern-driven detection (JSON configuration files)
- ✅ Service type classification (frontend, api-server, worker, library)
- ✅ Framework detection (Next.js, NestJS, FastAPI, etc.)

**Out of Scope (future):**
- ❌ Diagram generation (handled by AI from analyzed data)
- ❌ Configuration/secrets detection
- ❌ Auth pattern detection
- ❌ Deployment/infrastructure detection

---

## Overview

SpecMind automatically splits codebase analysis into smaller, logical chunks organized by **services** and **layers**.

**This is the default behavior** - no flags needed. The CLI will automatically:
1. Detect all services in the codebase (monorepo or single service)
2. Split each service's files by architectural layer (data, API, service, external)
3. Track dependencies within and across layers
4. Track dependencies between services (HTTP calls and imports)
5. Detect architecture violations

**Benefits:**
- Fits within LLM context windows (~20K tokens per chunk, well under 25K limit)
- Organized by architectural concerns
- Enables incremental and focused analysis
- Works for both monoliths and microservices
- Provides data for AI-generated diagrams

---

## Output Structure

**Default output location:** `.specmind/system/`

### Structure

```
.specmind/system/
├── metadata.json                          # Root metadata (pretty-printed)
│   ├── analyzedAt
│   ├── architecture: "monolith" | "microservices"
│   ├── services: [...]
│   ├── totals: { files, functions, classes, calls, languages }
│   ├── crossLayerDependencies: {}         # Global cross-layer summary
│   ├── crossServiceDependencies: {}       # HTTP + import dependencies
│   └── violations: [...]                  # Architecture violations
│
└── services/
    └── api-service/
        ├── metadata.json                  # Service metadata (pretty-printed)
        │   ├── name, rootPath, entryPoint, type, framework
        │   ├── filesAnalyzed, layers
        │   └── crossLayerDependencies: {}  # Service-level cross-layer deps
        │
        ├── data-layer/
        │   ├── summary.json               # Layer summary (pretty-printed)
        │   │   ├── layer, totalFiles, totalChunks
        │   │   ├── chunkManifest: [...]   # Which files in which chunks
        │   │   ├── databases: {...}       # Database metadata
        │   │   ├── summary: {...}         # Metrics
        │   │   └── crossLayerDependencies: [...] # Detailed cross-layer deps
        │   │
        │   ├── chunk-0.json               # Files 1-N (minified, ~20K tokens)
        │   └── chunk-1.json               # Files N+1-M (minified, ~20K tokens)
        │
        ├── api-layer/
        │   ├── summary.json               # Includes endpoints metadata
        │   └── chunk-0.json
        │
        ├── service-layer/
        │   ├── summary.json
        │   └── chunk-0.json
        │
        └── external-layer/
            ├── summary.json               # Includes external services metadata
            └── chunk-0.json
```

### File Size Limits

- **`summary.json`**: Target <50KB, pretty-printed for readability
- **`chunk-N.json`**: Max ~20K tokens (~80KB), minified (no whitespace) to maximize data
- **`metadata.json`**: Pretty-printed, no size limit

### Chunking Strategy

When a layer contains many files, they are split into chunks:
1. Files are grouped sequentially until ~20K token limit is reached (estimated as text_length / 4)
2. Each chunk is saved as `chunk-N.json` (minified)
3. Chunk manifest in `summary.json` lists which files are in which chunk
4. Same-layer dependencies are included only in the chunk containing those files

---

## Key Concepts: Layers vs Service Types

SpecMind uses two distinct classification systems:

### 1. Layers (File Classification)

**What:** Architectural layers that classify **individual files** within a service

**Count:** 4 layers

```typescript
type Layer = 'data' | 'api' | 'service' | 'external'
```

**Purpose:** Organize files by architectural concern

**Example:**
```
api-service/
├── data-layer/         ← user-repository.ts, models.ts
├── api-layer/          ← user-controller.ts, routes.ts
├── service-layer/      ← user-service.ts, validators.ts
└── external-layer/     ← email-client.ts, stripe-client.ts
```

### 2. Service Types (Service Classification)

**What:** Type of service that classifies **entire services/applications**

**Count:** 5 types

```typescript
type ServiceType = 'frontend' | 'api-server' | 'worker' | 'library' | 'unknown'
```

**Purpose:** Identify what kind of application/service it is

**Example:**
```json
{
  "name": "web-ui-service",
  "type": "frontend",        // ← SERVICE TYPE
  "framework": "next",
  "layers": [                // ← Has all 4 LAYERS
    "data",
    "api",
    "service",
    "external"
  ]
}
```

### How They Work Together

**Every service has a type AND contains files split into layers:**

| Service | Service Type | Layers It Contains |
|---------|-------------|-------------------|
| `web-ui-service` | `frontend` | data, api, service, external |
| `api-service` | `api-server` | data, api, service, external |
| `worker-service` | `worker` | data, service, external |
| `shared-lib` | `library` | service |

**Key Point:** A **frontend** service (type) still has files organized into the 4 architectural **layers**. For example:
- `data` layer = State management, API client wrappers
- `api` layer = Next.js API routes, tRPC procedures
- `service` layer = React components, hooks, business logic
- `external` layer = fetch() calls to backend APIs

---

## Layer Detection

### Layer Categories

All files are automatically categorized into one or more of these layers:

#### 1. Data Layer (`data-layer/`)
**Purpose:** Files that interact with databases or data stores

**Detection Patterns:** (See `packages/core/src/analyzer/patterns/data-layer.json`)
- **ORMs:** Prisma, TypeORM, SQLAlchemy, Mongoose, Drizzle, Sequelize, etc.
- **Drivers:** pg, mysql2, psycopg2, redis, mongodb, etc.
- **File patterns:** `**/models/**`, `**/schemas/**`, `**/repositories/**`, etc.

**Enhanced Features:**
- ✅ Detects ORM/ODM usage
- ✅ Identifies database types (PostgreSQL, MySQL, Redis, MongoDB, etc.)
- ✅ Maps drivers to databases
- ✅ Extracts model definitions
- ✅ Tracks database-specific files

#### 2. API Layer (`api-layer/`)
**Purpose:** Files that define API routes, endpoints, or GraphQL schemas

**Detection Patterns:** (See `packages/core/src/analyzer/patterns/api-layer.json`)
- **Frameworks:** Express, NestJS, FastAPI, Flask, Django, Next.js, Hono, Elysia, etc.
- **Decorators:** `@Get`, `@Post`, `@app.route`, `@api_view`, etc.
- **File patterns:** `**/routes/**`, `**/controllers/**`, `**/api/**`, etc.

**Enhanced Features:**
- ✅ Extracts endpoint details (method, path, handler)
- ✅ Detects REST, GraphQL, tRPC, gRPC APIs
- ✅ Identifies framework used
- ✅ Counts HTTP methods (GET, POST, PUT, DELETE)

#### 3. External Layer (`external-layer/`)
**Purpose:** Files that interact with external services and APIs

**Detection Patterns:** (See `packages/core/src/analyzer/patterns/external-layer.json`)
- **HTTP Clients:** axios, fetch, requests, httpx, etc.
- **Cloud SDKs:** AWS SDK, Google Cloud, Azure, etc.
- **Payment:** Stripe, PayPal, Square, etc.
- **AI:** OpenAI, Anthropic, Cohere, HuggingFace, etc.
- **Message Queues:** RabbitMQ, Kafka, SQS, Celery, Bull, etc.
- **File patterns:** `**/integrations/**`, `**/clients/**`, etc.

**Enhanced Features:**
- ✅ Categorizes external services by type (payment, messaging, cloud, AI, etc.)
- ✅ Detects message queue systems
- ✅ Identifies HTTP clients and SDKs
- ✅ Extracts HTTP calls with full details (method, URL, client type)
- ✅ Tracks cloud providers

#### 4. Service Layer (`service-layer/`)
**Purpose:** Business logic, utilities, and files not in other layers

**Detection:** Default layer for files that don't match data/api/external

---

## Cross-Layer Dependencies

### How They Work

The analyzer tracks **import statements** between files in different layers within the same service:

```typescript
// Example:
// task-controller.ts (in api-layer) imports:
import { TaskService } from '../business/task-service.js'  // service-layer
import { CreateTaskInput } from '../data/models.js'         // data-layer

// These become cross-layer dependencies:
{
  "crossLayerDependencies": [
    {
      "source": "/path/to/task-controller.ts",
      "target": "/path/to/task-service.ts",
      "targetLayer": "service",
      "importedNames": ["TaskService"],
      "type": "uses",
      "direction": "api -> service"
    },
    {
      "source": "/path/to/task-controller.ts",
      "target": "/path/to/models.ts",
      "targetLayer": "data",
      "importedNames": ["CreateTaskInput"],
      "type": "uses",
      "direction": "api -> data"
    }
  ]
}
```

### Key Implementation Detail

**Cross-layer dependencies use absolute file paths** resolved from relative imports:

```typescript
// Import in code:
import { User } from './models/user.js'

// Resolved to absolute path:
{
  source: "/full/path/to/controller.ts",
  target: "/full/path/to/models/user.ts"  // ← Absolute path!
}
```

This is handled by `buildDependencyGraph()` in `dependency-graph.ts`, which:
1. Skips external packages (non-relative imports)
2. Resolves relative paths to absolute paths
3. Handles `.js` extensions (TypeScript ESM convention)
4. Tries multiple extensions (`.ts`, `.tsx`, `.js`, `.jsx`)
5. Handles index files

### Typical Dependency Flows

**Clean Architecture Pattern:**
```
API Layer ──uses──> Service Layer ──uses──> Data Layer
```

**Common Flows:**
1. **API → Service → Data** (Clean)
2. **API → Data** (Direct - potential code smell)
3. **External → Service → Data** (Clean)

### Architecture Violations

The analyzer detects violations of layered architecture:

```json
{
  "violations": [
    {
      "type": "reversed-dependency",
      "from": "data",
      "to": "service",
      "files": [
        {
          "source": "/path/to/model.ts",
          "target": "/path/to/service.ts",
          "reason": "data layer should not depend on service layer"
        }
      ]
    }
  ]
}
```

**Allowed Directions:**
- `api -> service`
- `api -> data`
- `api -> external`
- `service -> data`
- `service -> external`
- `external -> service`
- `external -> data`

**Violations (reversed dependencies):**
- `data -> *` (data layer should not depend on other layers)
- `service -> api`

---

## Cross-Service Dependencies

### How They Work

The analyzer tracks **both HTTP calls and imports** between services:

#### 1. HTTP-Based Dependencies

```typescript
// email-service-client.ts in api-service:
await fetch(`${this.config.baseUrl}/api/email/send-template`, {
  method: 'POST',
  // ...
})

// Detected as cross-service HTTP call:
{
  "crossServiceDependencies": {
    "api-service -> email-service": 2  // Count of HTTP calls
  }
}
```

HTTP calls are detected by:
1. Finding `fetch()`, `axios.*()`, and other HTTP client calls
2. Extracting URL and HTTP method
3. Matching URL patterns to service names
4. Counting dependencies per service pair

#### 2. Import-Based Dependencies

```typescript
// If services share code (monorepo):
import { SharedType } from '@company/shared-lib'

// Detected as cross-service import dependency
```

### URL Matching Logic

The analyzer matches HTTP URLs to services using heuristics:

```typescript
// URL patterns that indicate email-service:
`http://localhost:3001/api/email/*`     // Port-based
`http://email-service/api/*`            // Service name in host
`*/api/email/*`                         // Path-based

// Matches to: email-service
```

---

## Service Detection

### Detection Methods

The analyzer uses multiple heuristics to detect services:

#### 1. Monorepo Structure
```
my-project/
├── packages/
│   ├── api-gateway/     ← Service
│   └── worker/          ← Service
├── pnpm-workspace.yaml
```

Looks for:
- `packages/`, `services/`, `apps/`, `microservices/` directories
- Monorepo config files: `pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`
- `package.json` in each subdirectory

#### 2. Entry Point Detection
```
my-project/
├── src/
│   ├── api/
│   │   └── index.ts     ← Entry point (API service)
│   └── worker/
│       └── main.ts      ← Entry point (Worker service)
```

Looks for files named: `index.ts`, `main.py`, `server.ts`, `app.py`, etc.

#### 3. Docker Compose
```yaml
# docker-compose.yml
services:
  api-service:     ← Service
    build: ./api
  worker-service:  ← Service
    build: ./worker
```

Parses `docker-compose.yml` to find service names and directories.

#### 4. Single Service (Monolith)
If no multi-service structure is detected, treats entire codebase as one service.

### Service Type Classification

**Pattern-Driven Detection** (See `packages/core/src/analyzer/patterns/service-detection.json`)

Services are classified into types based on dependencies and file patterns:

| Type | How Detected | Examples |
|------|-------------|----------|
| **frontend** | React, Vue, Next.js, Angular in `package.json` | Next.js app, React SPA |
| **api-server** | Express, NestJS, FastAPI, Flask dependencies | REST API, GraphQL server |
| **worker** | Celery, Bull, RQ, BullMQ dependencies | Background jobs, task queues |
| **library** | `package.json` has `main`, `exports`, `types` fields | Shared utilities, SDK |
| **unknown** | Doesn't match above patterns | Generic service |

**Detection Priority:**
1. Frontend (checked first - may have `api/` folders)
2. API Server
3. Worker
4. Library
5. Unknown (fallback)

### Framework Detection

**Dynamic from Patterns** (No hardcoded lists!)

The `detectFramework()` function now reads from `service-detection.json`:

```typescript
// Automatically detects ALL frameworks in the pattern file:
const allFrameworks = [
  ...patterns.serviceDetection.apiServer.frameworks.typescript,
  ...patterns.serviceDetection.frontend.frameworks.typescript,
  ...patterns.serviceDetection.worker.frameworks.typescript,
];
```

**Priority System** ensures correct detection:
- **Meta-frameworks** (Next.js, Nuxt, NestJS) detected before base frameworks (React, Vue)
- Prevents false positives (Next.js project detected as React)

---

## Pattern-Driven Detection

### Configuration Files

All detection patterns are externalized to JSON files for easy maintenance:

```
packages/core/src/analyzer/patterns/
├── data-layer.json           # Data layer patterns
├── api-layer.json            # API layer patterns
├── external-layer.json       # External layer patterns
├── service-detection.json    # Service type & framework patterns
└── databases.json            # Database type mappings
```

### Benefits

1. **Single Source of Truth** - No duplication
2. **Easy Updates** - Add new frameworks without code changes
3. **Community Contributions** - Users can submit PRs with new patterns
4. **Language Separation** - TypeScript vs Python patterns clearly separated
5. **Testable** - Easy to test pattern matching

### Example: service-detection.json

```json
{
  "entryPoints": [
    "main.py", "index.ts", "server.ts", "app.py"
  ],
  "frontend": {
    "frameworks": {
      "typescript": ["react", "next", "vue", "svelte", ...],
      "python": []
    }
  },
  "apiServer": {
    "frameworks": {
      "typescript": ["express", "@nestjs/core", "fastify", ...],
      "python": ["fastapi", "flask", "django", ...]
    }
  },
  "worker": {
    "frameworks": {
      "typescript": ["bull", "bullmq", ...],
      "python": ["celery", "rq", ...]
    }
  }
}
```

---

## Supported Languages

| Language | Version | Support Level | Rationale |
|----------|---------|---------------|-----------|
| **TypeScript** | 5.x | ✅ Full | Most popular for modern web apps |
| **JavaScript** | ES2020+ | ✅ Full | Legacy codebases, Node.js backends |
| **Python** | 3.8+ | ✅ Full | FastAPI/Django/Flask APIs, ML services |

**Future Support:** Go, Java, C#, Rust, Ruby

---

## CLI Usage

### Command

```bash
specmind analyze [options]
```

### Options

```typescript
interface AnalyzeOptions {
  path?: string           // Path to analyze (default: current directory)
  outputDir?: string      // Output directory (default: '.specmind/system')
}
```

### Examples

```bash
# Analyze current directory
specmind analyze

# Analyze specific directory
specmind analyze --path ./src

# Custom output directory
specmind analyze --output ./docs/architecture
```

---

## How Analysis Works

### High-Level Flow

```
1. File Discovery
   └── Find all TypeScript, JavaScript, Python files

2. Service Detection
   └── Detect monorepo, Docker Compose, or single service

3. File Analysis (Tree-sitter parsing)
   ├── Extract functions, classes, imports, exports
   ├── Extract API endpoints (routes, decorators)
   ├── Extract HTTP calls (fetch, axios, requests)
   └── Extract database usage (ORMs, drivers)

4. Layer Classification
   └── Assign each file to layers based on patterns

5. Dependency Graph Building
   ├── Build import dependency graph (absolute paths)
   └── Extract HTTP call dependencies

6. Cross-Layer Analysis
   ├── Identify dependencies between layers
   ├── Detect architecture violations
   └── Calculate dependency summaries

7. Cross-Service Analysis
   ├── Match HTTP URLs to services
   ├── Count service-to-service dependencies
   └── Track both HTTP and import dependencies

8. Chunking & Output
   ├── Split large layers into ~20K token chunks
   ├── Write pretty-printed summaries
   ├── Write minified chunks
   └── Write metadata files
```

### Key Components

**Packages:**
- `@specmind/core` - Analysis engine
  - `parser.ts` - Tree-sitter wrapper
  - `file-analyzer.ts` - Analyzes individual files
  - `service-detector.ts` - Detects services
  - `layer-detector.ts` - Classifies files into layers
  - `dependency-graph.ts` - Builds dependency graph (absolute path resolution!)
  - `split-analyzer.ts` - Orchestrates analysis and chunking
  - `patterns/*.json` - Detection pattern configuration

- `@specmind/cli` - CLI interface
  - `commands/analyze.ts` - Analyze command implementation

---

## What's Different from Original Spec

### ✅ Implemented

1. **Pattern-driven detection** - All patterns in JSON files (not hardcoded)
2. **Absolute path resolution** - Cross-layer dependencies use resolved absolute paths
3. **HTTP call tracking** - Detects and matches HTTP calls to services
4. **Service type classification** - frontend, api-server, worker, library
5. **Framework detection** - Dynamically from patterns, with priority system
6. **Architecture violations** - Detects reversed dependencies

### ❌ Removed from Original Spec

1. **Diagram generation** - No longer generated in code
   - Diagrams were generating in `split-analyzer.ts` (removed ~400 lines)
   - AI now generates diagrams from analyzed data
   - Removed: `generateServiceArchitectureDiagram()`, `generateSequenceDiagram()`, etc.

2. **Diagram output files** - No `.sm` files
   - Removed: `sequence-diagram.sm`, `architecture-diagram.sm`
   - AI generates diagrams on-demand from JSON data

3. **Database colors/icons** - Removed from `databases.json`
   - No longer needed since diagrams are AI-generated
   - Colors/styling handled by AI

### 🔄 Changed

1. **Output location** - Changed from `.specmind/analysis/` to `.specmind/system/`
2. **Service detection** - Now uses `service-detection.json` patterns
3. **Framework detection** - Now reads from patterns, no hardcoded lists

---

## Success Metrics

1. **Context Window Fit**: Each chunk file ≤ 20K tokens (~80KB), well within LLM limits
2. **Accurate Detection**: Correct service and layer classification
3. **Performance**: Analysis < 10s for 1000+ files
4. **Usability**: Clear structure, no configuration needed

---

## Testing

### Unit Tests

```bash
pnpm --filter=@specmind/core test
```

Tests cover:
- Service detection (monorepo, monolith, Docker Compose)
- Layer detection (data, API, service, external)
- Dependency graph building (absolute path resolution)
- Pattern loading
- Cross-layer dependency tracking

### Integration Tests

```bash
# Run analyze on example projects
pnpm --filter=specmind analyze --path examples/task-management
```

Verifies:
- Correct service detection
- Proper layer classification
- Accurate dependency tracking
- Valid output structure
