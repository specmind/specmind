# /analyze - Analyze Codebase

This prompt template contains the core logic for the `/analyze` command that analyzes a codebase and creates system architecture documentation.

## Instructions

1. **Run the analysis tool:**

   **For local development (testing unreleased changes):**
   ```bash
   # From the specmind repository root
   node packages/cli/dist/index.js analyze --path <project-path>
   ```

   **For published version:**
   ```bash
   npx specmind analyze
   ```

2. **Review the analysis output** in `.specmind/system/`:

   **⚠️ CRITICAL: You MUST read ALL chunk files for accurate diagrams**

   **Root Level:**
   - `metadata.json`: **READ THIS FIRST** - Overall summary with:
     - Services detected (monorepo vs monolith)
     - Architecture type (`microservices` or `monolith`)
     - **`layers.data.databases` array** - List of detected databases (e.g., ["postgresql", "redis"])
     - Total files, functions, classes analyzed
     - Cross-layer dependency summary (e.g., `"api -> service": 45`)
     - Cross-service dependency summary (e.g., `"api-service -> email-service": 2`)
     - Architecture violations (if any)

   **Service Level:**
   - `services/{service}/metadata.json`: Service metadata with:
     - Service name, type (`frontend`, `api-server`, `worker`, `library`, `unknown`)
     - Framework detected (e.g., `next`, `express`, `fastapi`)
     - Files analyzed count
     - Cross-layer dependencies for this service

   **Layer Level (READ ALL CHUNKS!):**
   - `services/{service}/data-layer/`:
     - `summary.json`: Database metadata, ORM detection, model counts
     - **`chunk-N.json`**: ⚠️ MUST READ - Contains ALL classes, functions, methods with signatures (max ~20K tokens per chunk)

   - `services/{service}/api-layer/`:
     - `summary.json`: API endpoints, framework info, HTTP method counts
     - **`chunk-N.json`**: ⚠️ MUST READ - Contains ALL controllers, routes, endpoints with parameters (max ~20K tokens per chunk)

   - `services/{service}/service-layer/`:
     - `summary.json`: Business logic files, function/class counts
     - **`chunk-N.json`**: ⚠️ MUST READ - Contains ALL business logic classes and methods (max ~20K tokens per chunk)

   - `services/{service}/external-layer/`:
     - `summary.json`: External services (payment, cloud, AI, messaging), HTTP calls
     - **`chunk-N.json`**: ⚠️ MUST READ - Contains ALL external service clients and API calls (max ~20K tokens per chunk)

3. **Understand the analysis structure:**

   **Layers (4 types) - File Classification:**
   - `data`: Database access, ORMs, models, repositories
   - `api`: Routes, controllers, endpoints, GraphQL schemas
   - `service`: Business logic, utilities, domain services
   - `external`: HTTP clients, external APIs, SDKs, message queues

   **Service Types (5 types) - Service Classification:**
   - `frontend`: React, Next.js, Vue, Angular apps
   - `api-server`: Express, NestJS, FastAPI, Flask backends
   - `worker`: Celery, Bull, RQ background job processors
   - `library`: Shared libraries/SDKs
   - `unknown`: Generic services

   **Key Insight:** Every service has a type AND contains files split into layers.
   Example: A `frontend` service (type) still has files organized into `data`, `api`, `service`, and `external` layers.

4. **Read ALL chunk files for ALL services:**

   **⚠️ THIS IS A CRITICAL STEP - DO NOT SKIP**

   Before generating any diagrams, you MUST read ALL chunk files:

   For EACH service (e.g., api-service, email-service, web-ui-service):
   - Read `.specmind/system/services/{service}/data-layer/chunk-*.json` (ALL chunks: chunk-0.json, chunk-1.json, etc.)
   - Read `.specmind/system/services/{service}/api-layer/chunk-*.json` (ALL chunks: chunk-0.json, chunk-1.json, etc.)
   - Read `.specmind/system/services/{service}/service-layer/chunk-*.json` (ALL chunks: chunk-0.json, chunk-1.json, etc.)
   - Read `.specmind/system/services/{service}/external-layer/chunk-*.json` (ALL chunks: chunk-0.json, chunk-1.json, etc.)

   **Note:** Chunk numbering starts at 0 (chunk-0.json, chunk-1.json, chunk-2.json, etc.)

   **Why this is critical:**
   - Chunks contain ALL classes, methods, and function signatures
   - Chunks contain method-level call information
   - Summary files only have counts, not the actual details
   - Future features depend on having ALL methods in the diagrams

5. **Analyze the codebase structure:**

   After reading all chunks, review `.specmind/system/metadata.json` to understand:
   - **Services**: How many services exist and what types they are
   - **Layers**: Distribution of code across architectural layers
   - **Technologies**:
     - **Databases**: Check `layers.data.databases` array in metadata.json (e.g., ["postgresql", "redis"])
     - **Frameworks**: Check service metadata for framework information
   - **External Services**: Check `services/{service}/external-layer/summary.json` for detected external services
   - **Dependencies**:
     - Cross-layer (imports between layers within a service) - Check `crossLayerDependencies` in metadata.json
     - Cross-service (HTTP calls + imports between services) - Check `crossServiceDependencies` in metadata.json
   - **Violations**: Architecture violations from `violations` array in metadata.json

6. **Generate system architecture documentation:**

   Using the analyzed data, create a comprehensive `.specmind/system.sm` file with these sections:

   **Global Sections:**
   - **## Overview** - High-level system architecture description
   - **## System Architecture** - Global view diagram of all services, databases, external systems
   - **## Cross-Service Flows** - Section containing multiple subsections, one sequence diagram per flow:
     - **### {Flow Name} Flow** (e.g., "Create Task Flow", "Update Task Flow") - One diagram per flow

   **Per-Service Sections (one section per service):**
   - **## {service-name} Service** - Service overview (type, framework)
   - **### Architecture** - Service diagram showing all classes/methods organized by layer
   - **### Architectural Layers** - Describe the 4 layers for this service:
     - Data Layer - databases, ORMs, models
     - API Layer - endpoints, controllers, routes
     - Service Layer - business logic, utilities
     - External Layer - external services, HTTP clients
   - **### Technology Stack** - Technologies used in this service
   - **### Architecture Violations** - Service-specific violations (if any)

   ### Required Diagrams:

   Generate these diagrams in the order they appear in the document structure above.

   **1. System Architecture (Global View)**

   Show ALL services, databases, external systems, and their relationships:

   **Example diagram (for illustration - only include what's actually detected!):**

   ```mermaid
   graph TB
       subgraph Frontend
           UI[web-ui-service<br/>Type: frontend<br/>Framework: React]
       end

       subgraph Backend Services
           API[api-service<br/>Type: api-server<br/>Framework: Express]
           EMAIL[email-service<br/>Type: api-server<br/>Framework: Express]
       end

       subgraph Data Stores
           PG[(PostgreSQL<br/>Driver: pg)]
           REDIS[(Redis<br/>Driver: redis)]
       end

       subgraph External Systems
           STRIPE[Stripe API]
           AWS[AWS S3]
       end

       UI -->|HTTP: 6 calls| API
       API -->|HTTP: 2 calls| EMAIL
       API --> PG
       API --> REDIS
       API --> STRIPE

       style PG fill:#336791,color:#fff
       style REDIS fill:#DC382D,color:#fff
       style STRIPE fill:#635BFF,color:#fff
       style AWS fill:#FF9900,color:#000
   ```

   **Requirements:**
   - **CRITICAL: Only include what is actually detected in the analysis** - Do NOT add databases, external services, or frameworks from the example if they're not in the analyzed data
   - Include ALL services with type and framework (do NOT include file counts)
   - **Show ONLY databases listed in `.specmind/system/metadata.json` under `layers.data.databases`** - Do NOT add any other databases, even if they appear in examples or brand color lists
   - Show ALL external services ONLY if detected in external-layer/summary.json (payment, email, cloud, AI, etc.)
   - Label cross-service HTTP calls with call counts
   - Group logically (Frontend, Backend, Data, External)
   - **CRITICAL: Do NOT use light colors for service nodes** - Light fills (#e1f5ff, #fff4e1, etc.) are unreadable in dark mode
   - **Use brand colors ONLY for databases and external services:**
     - PostgreSQL: `style PG fill:#336791,color:#fff`
     - MySQL: `style MYSQL fill:#4479A1,color:#fff`
     - MongoDB: `style MONGO fill:#47A248,color:#fff`
     - Redis: `style REDIS fill:#DC382D,color:#fff`
     - SQLite: `style SQLITE fill:#003B57,color:#fff`
     - Stripe: `style STRIPE fill:#635BFF,color:#fff`
     - AWS: `style AWS fill:#FF9900,color:#000`
     - OpenAI: `style OPENAI fill:#10A37F,color:#fff`
     - SendGrid: `style SENDGRID fill:#1A82E2,color:#fff`
     - Twilio: `style TWILIO fill:#F22F46,color:#fff`

   **2. Cross-Service Flows (Sequence Diagrams)**

   **CRITICAL: Generate ONE separate diagram for EACH flow - do NOT combine multiple flows into one diagram**

   Analyze the codebase to identify distinct flows (e.g., Create Task, Update Task, Delete Task, Get Task, etc.) and generate a separate sequence diagram for each flow.

   **Example for "Create Task" flow:**

   ```mermaid
   sequenceDiagram
       participant UI as web-ui-service
       participant API as api-service<br/>TaskController
       participant TS as TaskService
       participant TR as TaskRepository
       participant EMAIL as email-service<br/>EmailController
       participant ES as EmailService
       participant DB as PostgreSQL

       UI->>API: POST /api/tasks<br/>createTask(req, res)
       API->>TS: create(taskData)
       TS->>TR: save(task)
       TR->>DB: INSERT INTO tasks
       DB-->>TR: task record
       TS->>EMAIL: POST /api/email/send-template<br/>sendTemplateEmail(request)
       EMAIL->>ES: sendEmail(template, data)
       ES-->>EMAIL: { messageId, status }
       EMAIL-->>TS: { messageId, status }
       TS-->>API: task
       API-->>UI: 201 Created { task }
   ```

   **Example for "Update Task" flow:**

   ```mermaid
   sequenceDiagram
       participant UI as web-ui-service
       participant API as api-service<br/>TaskController
       participant TS as TaskService
       participant TR as TaskRepository
       participant DB as PostgreSQL

       UI->>API: PUT /api/tasks/:id<br/>updateTask(req, res)
       API->>TS: update(id, data)
       TS->>TR: findById(id)
       TR->>DB: SELECT * FROM tasks WHERE id = ?
       DB-->>TR: task
       TS->>TR: save(updatedTask)
       TR->>DB: UPDATE tasks SET ... WHERE id = ?
       DB-->>TR: updated task
       TS-->>API: updatedTask
       API-->>UI: 200 OK { task }
   ```

   **Requirements:**
   - **CRITICAL: Generate ONE diagram per flow** - Do NOT combine multiple flows into one diagram
   - **CRITICAL: Identify all distinct flows** - Analyze API endpoints, HTTP calls, and method calls to find all unique user/system flows
   - Show ALL cross-service flows (from `httpCalls` and `crossServiceDependencies`)
   - For each flow, trace the internal method calls (from `calls` data)
   - Include HTTP method and path (GET /api/tasks, POST /api/email, etc.)
   - Show method signatures with key parameters
   - Show database operations (INSERT, UPDATE, SELECT, DELETE)
   - Title each diagram with the flow name (e.g., "### Create Task Flow", "### Update Task Flow")
   - Show complete request/response cycle
   - Only include participants relevant to that specific flow

   **3. Per-Service Architecture (Detailed Layer View)**

   **IMPORTANT: Generate a SEPARATE diagram for EACH service in the system.**

   For example, if there are 3 services (api-service, email-service, web-ui-service), you MUST generate 3 diagrams.

   For EACH service, generate a diagram showing ALL functions/methods organized by layer:

   **Example for api-service:**

   **IMPORTANT: Use proper HTML entity escaping for angle brackets in method signatures**
   - Use `#lt;` instead of `<`
   - Use `#gt;` instead of `>`
   - Example: `Promise#lt;Task[]#gt;` instead of `Promise<Task[]>`

   ```mermaid
   graph TB
       subgraph "API Layer"
           TC["TaskController<br/>createTask(req, res)<br/>updateTask(req, res)<br/>deleteTask(req, res)<br/>getTask(req, res)"]
           UC["UserController<br/>getUser(req, res)<br/>updateUser(req, res)"]
       end

       subgraph "Service Layer"
           TS["TaskService<br/>create(data: CreateTaskInput)<br/>update(id: string, data)<br/>delete(id: string)<br/>validate(task)"]
           US["UserService<br/>findById(id: string)<br/>update(id, data)"]
           TV["TaskValidator<br/>validateCreate(input)<br/>validateUpdate(input)"]
       end

       subgraph "Data Layer"
           TR["TaskRepository<br/>save(task: Task)<br/>findById(id: string)<br/>delete(id: string)<br/>findAll()"]
           UR["UserRepository<br/>findById(id: string)<br/>update(id, user)"]
           TM["Task Model<br/>id: uuid<br/>title: string<br/>status: enum"]
       end

       subgraph "External Layer"
           ESC["EmailServiceClient<br/>sendEmail(request)<br/>checkHealth()"]
           SC["StripeClient<br/>createPayment(amount)"]
       end

       TC -->|calls| TS
       TC -->|calls| TR
       TS -->|calls| TV
       TS -->|calls| TR
       TS -->|calls| ESC
       UC -->|calls| US
       US -->|calls| UR
   ```

   **Requirements:**
   - **CRITICAL: Do NOT use any fill colors for nodes** - Colored fills are unreadable in dark mode
   - **CRITICAL: Generate ONE diagram for EACH service** (if 3 services exist, generate 3 diagrams)
   - **CRITICAL: Review ALL chunk files in ALL layers for ALL services** - This is a one-time job that must be accurate
   - **CRITICAL: Use double quotes for node labels** - Use `TC["TaskController..."]` not `TC[TaskController...]`
   - **CRITICAL: Escape angle brackets** - Use `#lt;` and `#gt;` instead of `<` and `>` in type signatures
   - Show ALL classes and their methods (read every chunk-N.json file)
   - Include method signatures with key parameters (escape angle brackets!)
   - Show method-level calls between layers (use `calls` data from analysis)
   - Do NOT include file counts in layer labels
   - Highlight violations with red styling if detected
   - **Do NOT skip any files or services** - Future features depend on this being complete
   - **Structure in documentation:** Create separate sections for each service:
     - Section: "## api-service Architecture" with diagram
     - Section: "## email-service Architecture" with diagram
     - Section: "## web-ui-service Architecture" with diagram

7. **Create the .specmind directory structure:**
   ```bash
   mkdir -p .specmind/features
   ```

8. **Write the system.sm file** at `.specmind/system.sm`:

   **Example structure:**

   ```
   # System Architecture

   ## Overview
   [High-level description]

   ## System Architecture
   [Mermaid diagram: Global view of all services, databases, external systems]

   ## Cross-Service Flows

   ### Create Task Flow
   [Mermaid sequence diagram: Complete flow for creating a task]

   ### Update Task Flow
   [Mermaid sequence diagram: Complete flow for updating a task]

   ### Delete Task Flow
   [Mermaid sequence diagram: Complete flow for deleting a task]

   [... one subsection per flow ...]

   ## api-service Service
   ### Architecture
   [Mermaid diagram: All classes/methods organized by layer]

   ### Architectural Layers
   #### Data Layer
   [Data layer details for api-service]

   #### API Layer
   [API layer details for api-service]

   #### Service Layer
   [Service layer details for api-service]

   #### External Layer
   [External layer details for api-service]

   ### Technology Stack
   [Technologies used in api-service]

   ### Architecture Violations
   [Violations for api-service, if any]

   ## email-service Service
   ### Architecture
   [Mermaid diagram: All classes/methods organized by layer]

   ### Architectural Layers
   [Same structure as above]

   [... repeat for each service ...]
   ```

9. **Confirm completion** to the user

## Expected Output

The `.specmind/system.sm` file should be created as a markdown file with:
- Comprehensive system documentation
- **AI-generated Mermaid diagrams** based on analyzed data
- Service types and framework information
- Cross-layer and cross-service dependency analysis
- Architecture violation warnings (if any)
- Technology stack summary

## Notes

- Analysis data is in `.specmind/system/` (JSON format)
- AI should generate diagrams from this data, not copy pre-generated ones
- Diagrams should be tailored to what's important for the specific codebase
- Focus on clarity and usefulness of documentation
- Violations indicate potential architecture issues worth highlighting
