# Task Management System - SpecMind Example

This is a comprehensive example project demonstrating how SpecMind analyzes and documents a multi-service architecture with external services and databases. The project implements a task management system with three microservices, each following a clear layered architecture pattern.

## Project Overview

The Task Management System consists of:

1. **API Service** (Backend) - REST API for task management with PostgreSQL and Redis
2. **Web UI Service** (Frontend) - React-based user interface
3. **Email Service** (External Service) - Microservice for sending email notifications

All services follow a **4-layer architecture**:
- **Presentation Layer**: User interface / API endpoints
- **Business Layer**: Business logic and validation
- **Data Layer**: Data access and API communication
- **Infrastructure Layer**: External dependencies and utilities

### External Dependencies

- **PostgreSQL** - Primary database for persistent storage
- **Redis** - Caching layer for improved performance
- **SMTP Server** - Email delivery infrastructure

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          Task Management System                                  │
├─────────────────────┬─────────────────────┬────────────────────────────────────┤
│   API Service       │  Web UI Service     │      Email Service                 │
│                     │                     │                                    │
│  ┌───────────────┐  │  ┌───────────────┐  │   ┌──────────────────────────┐    │
│  │ Presentation  │  │  │ Presentation  │  │   │    Presentation          │    │
│  │ - TaskControl │  │  │ - Dashboard   │  │   │    - EmailController     │    │
│  │ - Routes      │  │  │ - TaskList    │  │   │    - Routes              │    │
│  └───────┬───────┘  │  │ - TaskForm    │  │   └──────────┬───────────────┘    │
│          │          │  │ - App         │  │              │                    │
│  ┌───────▼───────┐  │  └───────┬───────┘  │   ┌──────────▼───────────────┐    │
│  │ Business      │  │  ┌───────▼───────┐  │   │    Business              │    │
│  │ - TaskService ├──┼──┤HTTP           │  │   │    - EmailSender         │    │
│  │ - TaskValidat │  │  │ Business      │  │   │    - TemplateService     │    │
│  │ - Notificatio ├──┼──┤ - TaskStore   │  │   └──────────┬───────────────┘    │
│  └───────┬───────┘  │  │ - FormValidat │  │              │                    │
│          │          │  └───────┬───────┘  │   ┌──────────▼───────────────┐    │
│  ┌───────▼───────┐  │  ┌───────▼───────┐  │   │    Data                  │    │
│  │ Data          │  │  │ Data          │  │   │    - EmailQueue          │    │
│  │ - TaskRepo    │  │  │ - ApiClient   │  │   └──────────┬───────────────┘    │
│  │ - UserRepo    │  │  │ - CacheManager│  │              │                    │
│  └───────┬───────┘  │  └───────┬───────┘  │   ┌──────────▼───────────────┐    │
│          │          │          │          │   │    Infrastructure        │    │
│  ┌───────▼───────┐  │  ┌───────▼───────┐  │   │    - SMTPClient          │    │
│  │ Infrastruct   │  │  │ Infrastruct   │  │   └──────────────────────────┘    │
│  │ - PostgreSQL  │  │  │ - HttpClient  │  │              │                    │
│  │ - Redis       │  │  │ - Router      │  │              ▼                    │
│  │ - EmailClient │  │  │ - LocalStorag │  │       [SMTP Server]               │
│  │ - AuthService │  │  └───────────────┘  │                                    │
│  └───────┬───────┘  │                     │                                    │
│          │          │                     │                                    │
│          ▼          │                     │                                    │
│  ┌───────────────┐  │                     │                                    │
│  │ PostgreSQL DB │  │                     │                                    │
│  └───────────────┘  │                     │                                    │
│          ▼          │                     │                                    │
│  ┌───────────────┐  │                     │                                    │
│  │ Redis Cache   │  │                     │                                    │
│  └───────────────┘  │                     │                                    │
└─────────────────────┴─────────────────────┴────────────────────────────────────┘

Service Communication:
- Web UI → API Service (HTTP REST)
- API Service → Email Service (HTTP REST)
- API Service → PostgreSQL (SQL)
- API Service → Redis (Cache Protocol)
- Email Service → SMTP Server (SMTP Protocol)
```

## API Service Structure

```
api-service/
└── src/
    ├── presentation/              # REST API Endpoints
    │   ├── task-controller.ts      # HTTP request handlers
    │   └── routes.ts               # Route configuration
    ├── business/                  # Business Logic
    │   ├── task-service.ts         # Core task operations
    │   ├── task-validator.ts       # Validation rules
    │   └── notification-service.ts # Notification orchestration
    ├── data/                      # Data Access
    │   ├── models.ts               # Data models/types
    │   ├── task-repository-postgres.ts  # Task data with PostgreSQL
    │   └── user-repository-postgres.ts  # User data with PostgreSQL
    ├── infrastructure/            # External Dependencies
    │   ├── postgres.ts             # PostgreSQL connection + schema
    │   ├── redis-cache.ts          # Redis caching client
    │   ├── email-service-client.ts # HTTP client for Email Service
    │   └── auth.ts                 # JWT authentication
    └── index.ts                   # Application entry point
```

### API Service Layers

**Presentation Layer:**
- `TaskController`: Handles HTTP requests/responses for task operations
- `routes.ts`: Configures Express routes with middleware

**Business Layer:**
- `TaskService`: Orchestrates task operations, enforces business rules
- `TaskValidator`: Validates task data against business constraints
- `NotificationService`: Coordinates with Email Service for notifications

**Data Layer:**
- `TaskRepositoryPostgres`: Manages task persistence in PostgreSQL with Redis caching
- `UserRepositoryPostgres`: Manages user data in PostgreSQL
- `models.ts`: Defines data structures (Task, User, DTOs)

**Infrastructure Layer:**
- `PostgresDatabase`: Connection pooling, schema initialization
- `RedisCache`: Caching operations with TTL management
- `EmailServiceClient`: HTTP client for calling Email Service
- `AuthService` + `authMiddleware`: JWT authentication

### Technology Stack

- **Runtime**: Node.js with TypeScript
- **Web Framework**: Express.js
- **Database**: PostgreSQL with `pg` driver
- **Cache**: Redis with `redis` client
- **Authentication**: JWT tokens

## Email Service Structure

```
email-service/
└── src/
    ├── presentation/          # REST API
    │   ├── email-controller.ts # Email sending endpoints
    │   └── routes.ts           # Route configuration
    ├── business/              # Business Logic
    │   ├── email-sender.ts     # Email queue processing
    │   └── email-template-service.ts # Template generation
    ├── data/                  # Data Layer
    │   └── email-queue.ts      # In-memory queue management
    ├── infrastructure/        # External Services
    │   └── smtp-client.ts      # SMTP connection
    └── index.ts               # Application entry point
```

### Email Service Layers

**Presentation Layer:**
- `EmailController`: REST endpoints for sending emails (plain and template-based)
- `routes.ts`: API route configuration

**Business Layer:**
- `EmailSender`: Queue management and retry logic
- `EmailTemplateService`: Generates email content from templates (task_assigned, task_status_changed, welcome)

**Data Layer:**
- `EmailQueue`: In-memory queue with retry tracking

**Infrastructure Layer:**
- `SMTPClient`: SMTP server connection and email delivery

### Email Templates

1. **task_assigned**: Notifies user when a task is assigned to them
2. **task_status_changed**: Notifies when task status changes
3. **welcome**: Welcome email for new users

## Web UI Service Structure

```
web-ui-service/
└── src/
    ├── presentation/          # React Components
    │   ├── App.tsx             # Root component
    │   ├── Dashboard.tsx       # Statistics dashboard
    │   ├── TaskList.tsx        # Task list view
    │   └── TaskForm.tsx        # Create/edit form
    ├── business/              # Client-side Business Logic
    │   ├── task-store.ts       # State management
    │   └── form-validator.ts   # Form validation
    ├── data/                  # API Communication
    │   ├── types.ts            # Type definitions
    │   ├── api-client.ts       # API HTTP client
    │   └── cache-manager.ts    # Local data caching
    ├── infrastructure/        # Browser APIs
    │   ├── http-client.ts      # Fetch wrapper
    │   ├── router.ts           # Client routing
    │   └── local-storage.ts    # Storage manager
    └── index.tsx              # Application entry point
```

### Web UI Service Layers

**Presentation Layer:**
- `App`: Main application component with navigation
- `Dashboard`: Displays task statistics and completion rate
- `TaskList`: Lists tasks with filtering by status
- `TaskForm`: Form for creating/editing tasks

**Business Layer:**
- `TaskStore`: State management with observer pattern
- `FormValidator`: Client-side validation before submission

**Data Layer:**
- `ApiClient`: Type-safe methods for API communication
- `CacheManager`: Caches API responses in local storage with TTL
- `types.ts`: TypeScript interfaces matching API models

**Infrastructure Layer:**
- `HttpClient`: Fetch wrapper with auth headers and error handling
- `Router`: Client-side routing with history API
- `LocalStorageManager`: Browser storage abstraction with JSON serialization

## Key Features Demonstrated

### Multi-Service Architecture
- **API Service**: Core business logic and data persistence
- **Email Service**: Dedicated microservice for notifications
- **Web UI Service**: Client-side application

### Inter-Service Communication
- Web UI → API Service: HTTP REST with JWT authentication
- API Service → Email Service: HTTP REST for async notifications
- Service health checks and graceful degradation

### Database Integration
- **PostgreSQL**:
  - Connection pooling for scalability
  - Automatic schema initialization
  - Parameterized queries for security
  - Indexes on frequently queried fields

### Caching Strategy
- **Redis**:
  - Cache individual tasks with 5min TTL
  - Cache task lists with 1min TTL
  - Pattern-based cache invalidation
  - Cache-aside pattern implementation

### Design Patterns
- **Repository Pattern**: Data access abstraction
- **Service Pattern**: Business logic encapsulation
- **Observer Pattern**: State management with subscribers
- **Template Method**: Email template generation
- **Factory Pattern**: Infrastructure component creation
- **Dependency Injection**: Loose coupling between layers

## Data Flow Examples

### Create Task Flow (with all integrations)

```
1. User fills form (TaskForm Component)
2. FormValidator validates input
3. TaskStore.createTask() called
4. ApiClient.createTask() → HTTP POST
5. API Service receives request
   ├─ TaskController.createTask()
   └─ TaskService.createTask()
       ├─ TaskValidator validates
       ├─ UserRepository checks assignee exists (PostgreSQL query)
       ├─ TaskRepository.create() saves to PostgreSQL
       ├─ Redis cache invalidated (pattern: tasks:*)
       └─ NotificationService.notifyTaskAssigned()
           ├─ UserRepository.findById() gets user email
           ├─ EmailServiceClient.sendTemplateEmail()
           └─ Email Service receives request
               ├─ EmailTemplateService generates email
               ├─ EmailSender queues email
               ├─ EmailQueue stores message
               └─ SMTPClient sends via SMTP
6. Response returns to Web UI
7. TaskStore updates local state
8. CacheManager invalidates local cache
9. UI re-renders with new task
```

### Get Tasks Flow (with caching)

```
1. Dashboard component loads
2. TaskStore.loadTasks() called
3. Check CacheManager (browser localStorage)
   ├─ Hit: Return cached data → Done
   └─ Miss: Continue to API
4. ApiClient.getTasks() → HTTP GET
5. API Service receives request
   ├─ TaskController.getAllTasks()
   └─ TaskRepository.findAll()
       ├─ Check Redis cache (key: tasks:all)
       │   ├─ Hit: Return cached tasks → Done
       │   └─ Miss: Query PostgreSQL
       ├─ PostgreSQL query executes
       ├─ Cache result in Redis (TTL: 60s)
       └─ Return tasks
6. Response returns to Web UI
7. CacheManager caches in localStorage (TTL: 5min)
8. TaskStore updates state
9. Dashboard renders statistics
```

## Environment Configuration

### API Service (.env)

```bash
PORT=3000
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=task_management
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
EMAIL_SERVICE_URL=http://localhost:3001
JWT_SECRET=your-secret-key
```

### Email Service (.env)

```bash
PORT=3001
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASSWORD=password
```

## Running the Services

### Prerequisites

```bash
# Start PostgreSQL
docker run --name postgres -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres

# Start Redis
docker run --name redis -p 6379:6379 -d redis
```

### Start Services

```bash
# Terminal 1: Email Service
cd email-service
npm install
npm run build
npm start

# Terminal 2: API Service
cd api-service
npm install
npm run build
npm start

# Terminal 3: Web UI (would need a dev server like Vite/webpack)
cd web-ui-service
npm install
npm run build
```

## Using with SpecMind

To analyze this project with SpecMind:

```bash
# From the repository root
specmind analyze --path examples/task-management

# This will generate:
# examples/task-management/.specmind/system/system.sm
```

The generated `.sm` file will contain:
- System-level architecture diagram showing all 3 services
- Service boundaries and dependencies
- Layer dependencies within each service
- External service integrations (PostgreSQL, Redis, SMTP)
- Component relationships and data flow

## Learning Objectives

This example demonstrates:

1. **Microservices Architecture**: Three independent services with clear responsibilities
2. **Layered Architecture**: Consistent 4-layer pattern across all services
3. **Database Integration**: PostgreSQL for persistence with proper connection pooling
4. **Caching Strategy**: Redis for performance with cache invalidation patterns
5. **Inter-Service Communication**: REST APIs for service-to-service calls
6. **External Services**: Integration with SMTP for email delivery
7. **Dependency Flow**: How data flows through layers and across services
8. **Real-World Patterns**: Repository, Service, Observer, Template, Factory, DI
9. **Error Handling**: Graceful degradation when external services are unavailable
10. **Scalability**: Connection pooling, caching, async processing

## Architecture Highlights

### Separation of Concerns
- Each service has a single responsibility
- Clear boundaries between layers
- Easy to test, maintain, and scale independently

### Scalability
- Connection pooling for database efficiency
- Redis caching reduces database load
- Async email processing via queue
- Services can scale independently

### Resilience
- Health checks for external services
- Graceful degradation (email service optional)
- Retry logic for failed emails
- Cache fallback on service failures

### Security
- JWT authentication on API endpoints
- Parameterized SQL queries prevent injection
- Password hashing (would be implemented in production)
- HTTPS for service communication (would use in production)

## Next Steps

- Run `specmind analyze` to generate architecture diagrams
- Open the generated `.sm` files in VS Code with the SpecMind extension
- Explore the interactive diagrams with zoom and fullscreen features
- Modify the code and re-run analysis to see how changes are reflected
- Add more services (e.g., Analytics Service, File Storage Service)
- Implement message queue (e.g., RabbitMQ) for better async processing
