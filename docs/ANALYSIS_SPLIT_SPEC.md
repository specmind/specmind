# Analysis Split Specification

> **TL;DR:** `specmind analyze` automatically detects services and splits files by architectural layers (data/API/service/external). Outputs to `.specmind/analysis/`. Supports TypeScript, JavaScript, and Python.

**Scope:**
- ✅ Multi-service detection
- ✅ Layer detection: data/api/service/external
- ✅ Cross-layer dependency tracking
- ✅ Database type detection
- ✅ API endpoint extraction
- ✅ Message queue detection

**Out of Scope (future):**
- ❌ Configuration/secrets detection
- ❌ Auth pattern detection
- ❌ Frontend framework detection
- ❌ Deployment/infrastructure detection

---

## Overview

This document specifies how SpecMind will **always** split codebase analysis into smaller, logical chunks organized by services and layers.

**This is the default behavior** - no flags needed. The CLI will automatically:
1. Detect all services in the codebase (monorepo or single service)
2. Split each service's files by architectural layer (data, API, service, external)
3. Generate cross-service layer views for system-wide analysis

**Benefits:**
- Fits within LLM context windows
- Organized by architectural concerns
- Enables incremental and focused analysis
- Works for both monoliths and microservices

---

## Supported Languages

### Initial Implementation (Phase 1)

| Language | Version | Support Level | Rationale |
|----------|---------|---------------|-----------|
| **TypeScript** | 5.x | ✅ Full | Most popular for modern web apps, Node.js APIs |
| **JavaScript** | ES2020+ | ✅ Full | Legacy codebases, Express/Node.js backends |
| **Python** | 3.8+ | ✅ Full | FastAPI/Django/Flask APIs, data processing, ML services |

### Future Support (Phase 2+)

| Language | Priority | Use Case |
|----------|----------|----------|
| **Go** | High | Microservices, high-performance APIs |
| **Java** | Medium | Enterprise backends, Spring Boot |
| **C#** | Medium | .NET applications, ASP.NET Core |
| **Rust** | Low | Performance-critical services |
| **Ruby** | Low | Rails applications |

### Language-Specific Detection Patterns

Detection patterns are tailored per language ecosystem:

#### TypeScript/JavaScript
```typescript
// Data Layer
- ORMs: prisma, typeorm, mongoose, sequelize, drizzle-orm, mikro-orm
- Drivers: pg, mysql2, redis, ioredis, mongodb

// API Layer
- Frameworks: express, @nestjs/common, fastify, koa, hapi, next
- Decorators: @Get, @Post, @Controller, @ApiTags

// External Layer
- HTTP: axios, node-fetch, got, undici
- SDKs: @aws-sdk/*, @stripe/*, @sendgrid/*, openai, @anthropic-ai/*

// Service Detection
- Entry: index.ts, server.ts, main.ts, app.ts
- Config: package.json, tsconfig.json
```

#### Python
```python
# Data Layer
- ORMs: sqlalchemy, tortoise, django.db, mongoengine, peewee
- Drivers: psycopg2, pymongo, redis, aiomysql

# API Layer
- Frameworks: fastapi, flask, django, starlette, tornado, aiohttp
- Decorators: @app.route, @app.get, @app.post, @api_view

# External Layer
- HTTP: requests, httpx, aiohttp, urllib3
- SDKs: boto3, stripe, sendgrid, openai, anthropic

# Service Detection
- Entry: main.py, app.py, __main__.py, manage.py
- Config: pyproject.toml, setup.py, requirements.txt
```

### Cross-Language Considerations

1. **Mixed Language Projects**: Detect and split by language first, then by layer
2. **Polyglot Services**: A service can contain multiple languages (e.g., TS frontend + Python backend)
3. **Future Extensibility**: Detection logic is pluggable - new languages can be added without changing core split logic

---

## Output Structure

**Default output location:** `.specmind/system/`

### Overview

Files are organized in a three-level hierarchy:
1. **Root level**: Cross-service dependencies and overall metadata
2. **Service level**: Per-service metadata and cross-layer dependencies
3. **Layer level**: Chunked file analysis (≤256KB per chunk)

### Structure

```
.specmind/system/
├── metadata.json                          # Root metadata (pretty-printed)
│   ├── analyzedAt
│   ├── architecture: "monolith" | "microservices"
│   ├── services: [...]
│   ├── totals: { files, functions, classes, calls, languages }
│   ├── crossServiceDependencies: [...]    # Dependencies between services
│   └── violations: [...]                  # Architecture violations
│
├── architecture-diagram.sm                # Component/architecture diagram
├── sequence-diagram.sm                    # Request flow diagram
│
└── services/
    ├── api-gateway/
    │   ├── metadata.json                  # Service metadata (pretty-printed)
    │   │   ├── name, rootPath, entryPoint, type, framework, port
    │   │   ├── filesAnalyzed, layers
    │   │   └── crossLayerDependencies: [...]  # Dependencies between layers
    │   │
    │   ├── data-layer/
    │   │   ├── summary.json               # Layer summary (pretty-printed)
    │   │   │   ├── layer, totalChunks, totalFiles
    │   │   │   ├── files: [...]           # Just file paths
    │   │   │   ├── databases: {...}       # Full database metadata
    │   │   │   ├── summary: {...}         # Metrics
    │   │   │   └── chunks: [...]          # Chunk manifest
    │   │   │
    │   │   ├── chunk-1.json               # Files 1-N (minified, ≤256KB)
    │   │   ├── chunk-2.json               # Files N+1-M (minified, ≤256KB)
    │   │   └── ...
    │   │
    │   ├── api-layer/
    │   │   ├── summary.json               # Includes endpoints metadata
    │   │   └── chunk-1.json
    │   │
    │   ├── service-layer/
    │   │   ├── summary.json
    │   │   ├── chunk-1.json
    │   │   └── chunk-2.json
    │   │
    │   └── external-layer/
    │       ├── summary.json               # Includes external services metadata
    │       └── chunk-1.json
    │
    ├── core-service/                      # Additional services (if microservices)
    │   └── ...
    │
    └── worker-service/
        └── ...
```

### File Size Limits

- **`summary.json`**: Target <50KB, pretty-printed for readability
- **`chunk-N.json`**: Max 256KB, minified (no whitespace) to maximize data
- **`metadata.json`**: Pretty-printed, no size limit (contains only metadata, not file analysis)

### Chunking Strategy

When a layer contains many files, they are split into chunks:
1. Files are grouped sequentially until 256KB limit is reached
2. Each chunk is saved as `chunk-N.json` (minified)
3. Chunk manifest in `summary.json` lists which files are in which chunk
4. Same-layer dependencies are included only in the chunk containing those files

### Monolith Structure

For single-service codebases:
```
.specmind/system/
├── metadata.json                          # crossServiceDependencies is empty
├── architecture-diagram.sm                # Component/architecture diagram
├── sequence-diagram.sm                    # Request flow diagram
└── services/
    └── my-app/                            # Single service
        ├── metadata.json                  # Contains all crossLayerDependencies
        └── [data/api/service/external]-layer/
            ├── summary.json
            └── chunk-*.json
```

### Generated Diagrams

Split analysis now automatically generates architecture diagrams in separate files:

**File Structure:**
```
.specmind/system/
├── architecture-diagram.sm                # Component/architecture diagram
└── sequence-diagram.sm                    # Request flow diagram
```

**Contents:**

**`architecture-diagram.sm`** - Component/Architecture Diagram:
- Shows system architecture:
   - Services as subgraphs (for microservices)
   - Layers within each service (data, api, service, external)
   - Databases with cylinder notation and brand colors
   - External services with proper icons
   - Cross-service dependencies
   - Cross-layer dependencies within services

**`sequence-diagram.sm`** - Sequence/Flow Diagram:
- Shows typical request flow:
   - Entry point (API/HTTP request)
   - Flow through layers (api → service → data)
   - Database interactions
   - External service calls
   - Response path

**Database Styling:**
- Uses cylinder notation: `[(Database Name)]`
- Brand colors from `databases.json`:
  - PostgreSQL: `#336791` (blue)
  - MySQL: `#4479A1` (blue)
  - MongoDB: `#47A248` (green)
  - Redis: `#DC382D` (red)
  - SQLite: `#003B57` (dark blue)
  - And more...

**Benefits:**
- ✅ Accurate diagrams generated from code analysis
- ✅ Consistent styling using pattern configurations
- ✅ LLM doesn't need to manually parse JSON to create diagrams
- ✅ Faster `/analyze` workflow - LLM uses pre-generated diagrams
- ✅ Can be used standalone for documentation

---

## Layer Detection

### Layer Categories

All files are automatically categorized into one or more of these layers:

#### 1. Data Layer (`data-layer/`)
**Purpose:** All files that interact with databases or data stores

**Output Files:**
- `summary.json`: Database metadata, file list, metrics (pretty-printed)
- `chunk-*.json`: Full file analysis for files in this layer (minified)

**Enhanced Features:**
- ✅ Detects ORM/ODM usage
- ✅ Identifies database types (PostgreSQL, MySQL, Redis, MongoDB, etc.)
- ✅ Maps drivers to databases
- ✅ Extracts model definitions
- ✅ Tracks database-specific files

**Detection Rules:**
```typescript
interface DataLayerDetection {
  // TypeScript/JavaScript ORMs
  tsJsOrms: [
    'prisma',
    '@prisma/client',
    'typeorm',
    'mikro-orm',
    '@mikro-orm/core',
    'sequelize',
    'sequelize-typescript',
    'mongoose',
    'typegoose',
    '@typegoose/typegoose',
    'knex',
    'objection',
    'drizzle-orm',
    'kysely',
    'bookshelf',
    'waterline'
  ]

  // Python ORMs
  pythonOrms: [
    'sqlalchemy',
    'sqlalchemy.orm',
    'django.db',
    'django.db.models',
    'tortoise',
    'tortoise.models',
    'peewee',
    'pony.orm',
    'mongoengine',
    'odmantic',
    'piccolo'
  ]

  // Database drivers - TypeScript/JavaScript
  tsJsDrivers: [
    'pg',                    // PostgreSQL
    'pg-promise',
    'postgres',
    'mysql',                 // MySQL
    'mysql2',
    'better-sqlite3',        // SQLite
    'sqlite',
    'sqlite3',
    'redis',                 // Redis
    'ioredis',
    '@redis/client',
    'mongodb',               // MongoDB
    'cassandra-driver',      // Cassandra
    '@elastic/elasticsearch', // Elasticsearch
    'neo4j-driver'           // Neo4j
  ]

  // Database drivers - Python
  pythonDrivers: [
    'psycopg2',              // PostgreSQL
    'psycopg',
    'asyncpg',
    'pymysql',               // MySQL
    'aiomysql',
    'mysqlclient',
    'sqlite3',               // SQLite
    'aiosqlite',
    'redis',                 // Redis
    'aioredis',
    'pymongo',               // MongoDB
    'motor',                 // Async MongoDB
    'cassandra',             // Cassandra
    'elasticsearch',         // Elasticsearch
    'py2neo',                // Neo4j
    'neo4j'
  ]

  // Query builders
  queryBuilders: [
    'knex',
    'kysely',
    '@databases/pg',
    '@databases/mysql',
    'slonik'
  ]

  // File patterns
  filePatterns: [
    '**/*model*.{ts,js,py}',
    '**/*schema*.{ts,js,py}',
    '**/*entity*.{ts,js,py}',
    '**/*repository*.{ts,js,py}',
    '**/models/**',
    '**/schemas/**',
    '**/entities/**',
    '**/repositories/**',
    '**/migrations/**',
    '**/db/**',
    '**/database/**',
    '**/persistence/**'
  ]

  // Code patterns (via tree-sitter)
  codePatterns: [
    // TypeORM
    '@Entity', '@Column', '@PrimaryGeneratedColumn',
    '@ManyToOne', '@OneToMany', '@ManyToMany',

    // Prisma
    'PrismaClient', '@prisma/client',

    // Mongoose
    'Schema(', 'model(',

    // SQLAlchemy
    'declarative_base', 'Base.metadata', 'db.Model',
    'Column(', 'relationship(',

    // Django
    'models.Model', 'models.CharField',

    // Generic patterns
    'class.*Model', 'class.*Entity', 'class.*Schema',
    'CREATE TABLE', 'ALTER TABLE', 'SELECT', 'INSERT', 'UPDATE', 'DELETE'
  ]
}
```

**Output Structure:**
```json
{
  "layer": "data",
  "files": [
    {
      "filePath": "src/models/user.py",
      "language": "python",
      "databases": ["postgresql"],
      "models": [...],
      "queries": [...],
      "functions": [...],
      "classes": [...],
      "imports": [...],
      "exports": [...],
      "calls": [...]
    }
  ],
  "dependencies": [
    {
      "source": "src/models/user.py",
      "target": "src/models/organization.py",
      "importedNames": ["Organization"],
      "type": "internal"
    }
  ],
  "crossLayerDependencies": [
    {
      "source": "src/models/user.py",
      "target": "src/utils/encryption.ts",
      "targetLayer": "service",
      "importedNames": ["hashPassword"],
      "type": "uses"
    }
  ],
  "databases": {
    "postgresql": {
      "driver": "psycopg2",
      "orm": "sqlalchemy",
      "files": ["src/models/user.py", "src/models/organization.py"],
      "totalModels": 12
    },
    "redis": {
      "driver": "redis",
      "orm": null,
      "files": ["src/cache/session.py"],
      "totalModels": 0
    }
  },
  "summary": {
    "totalFiles": 15,
    "totalModels": 12,
    "totalQueries": 234,
    "databaseTypes": ["postgresql", "redis"],
    "orms": ["sqlalchemy"]
  }
}
```

#### 2. API Layer (`api-layer/`)
**Purpose:** All files that define API routes, endpoints, or GraphQL schemas

**Output Files:**
- `summary.json`: Endpoint metadata, file list, metrics (pretty-printed)
- `chunk-*.json`: Full file analysis for files in this layer (minified)

**Enhanced Features:**
- ✅ Extracts endpoint details (method, path, handler)
- ✅ Detects REST, GraphQL, tRPC, gRPC APIs
- ✅ Identifies framework used
- ✅ Groups endpoints by resource
- ✅ Counts HTTP methods (GET, POST, PUT, DELETE)

**Detection Rules:**
```typescript
interface APILayerDetection {
  // TypeScript/JavaScript frameworks
  tsJsFrameworks: [
    'express',
    '@nestjs/common',
    '@nestjs/core',
    'fastify',
    '@fastify/cors',
    'koa',
    '@koa/router',
    'hapi',
    '@hapi/hapi',
    'restify',
    'polka',
    'micro',
    'next',                  // Next.js API routes
    'next/server',
    'remix',                 // Remix loaders/actions
    '@trpc/server',          // tRPC
    'elysia',
    'hono'
  ]

  // Python frameworks
  pythonFrameworks: [
    'fastapi',
    'flask',
    'django',
    'django.urls',
    'django.views',
    'starlette',
    'starlette.routing',
    'tornado',
    'tornado.web',
    'aiohttp',
    'aiohttp.web',
    'sanic',
    'falcon',
    'bottle',
    'cherrypy',
    'pyramid'
  ]

  // GraphQL frameworks
  graphqlFrameworks: [
    'graphql',
    'apollo-server',
    '@apollo/server',
    'apollo-server-express',
    'express-graphql',
    'graphql-yoga',
    'type-graphql',
    'nexus',
    'pothos',                // Pothos GraphQL
    'strawberry',            // Python GraphQL
    'graphene',              // Python GraphQL
    'ariadne'                // Python GraphQL
  ]

  // REST/HTTP decorators (via tree-sitter)
  httpDecorators: [
    // NestJS
    '@Get', '@Post', '@Put', '@Delete', '@Patch',
    '@Controller', '@ApiTags', '@ApiOperation',

    // FastAPI/Flask
    '@app.route', '@app.get', '@app.post', '@app.put', '@app.delete',
    '@router.get', '@router.post',

    // Django
    '@api_view', '@action',

    // TypeScript route builders
    'router.get(', 'router.post(', 'router.put(', 'router.delete(',
    'app.get(', 'app.post(', 'app.use(',

    // tRPC
    '.query(', '.mutation(',

    // Hono
    'app.route('
  ]

  // GraphQL decorators/patterns
  graphqlPatterns: [
    '@Query', '@Mutation', '@Resolver', '@Field',
    '@ObjectType', '@InputType',
    'GraphQLObjectType', 'GraphQLSchema',
    'type Query', 'type Mutation',
    'buildSchema('
  ]

  // File patterns
  filePatterns: [
    '**/routes/**',
    '**/routers/**',
    '**/controllers/**',
    '**/handlers/**',
    '**/api/**',
    '**/endpoints/**',
    '**/views/**',           // Django views
    '**/*route*.{ts,js,py}',
    '**/*router*.{ts,js,py}',
    '**/*controller*.{ts,js,py}',
    '**/*handler*.{ts,js,py}',
    '**/*endpoint*.{ts,js,py}',
    '**/*view*.{ts,js,py}',
    '**/app/api/**',         // Next.js app router
    '**/pages/api/**',       // Next.js pages router
    '*.graphql',
    '*.gql'
  ]

  // RPC/gRPC patterns
  rpcPatterns: [
    'grpc',
    '@grpc/grpc-js',
    'grpc-tools',
    '@trpc/server',
    'json-rpc',
    '*.proto'                // Protocol buffers
  ]
}
```

**Output Structure:**
```json
{
  "layer": "api",
  "files": [
    {
      "filePath": "src/api/users/routes.py",
      "language": "python",
      "framework": "fastapi",
      "endpoints": [
        {
          "method": "GET",
          "path": "/api/users/{user_id}",
          "handler": "get_user",
          "location": {...}
        },
        {
          "method": "POST",
          "path": "/api/users",
          "handler": "create_user",
          "location": {...}
        }
      ],
      "functions": [...],
      "classes": [...],
      "imports": [...],
      "exports": [...],
      "calls": [...]
    }
  ],
  "summary": {
    "totalEndpoints": 45,
    "frameworks": ["fastapi"],
    "methods": {
      "GET": 20,
      "POST": 15,
      "PUT": 5,
      "DELETE": 5
    }
  }
}
```

#### 3. External Layer (`external-layer/`)
**Purpose:** All files that interact with external services and APIs

**Output Files:**
- `summary.json`: External services metadata, message systems, file list, metrics (pretty-printed)
- `chunk-*.json`: Full file analysis for files in this layer (minified)

**Enhanced Features:**
- ✅ Categorizes external services by type (payment, messaging, cloud, AI, etc.)
- ✅ Detects message queue systems (RabbitMQ, Kafka, SQS, Celery)
- ✅ Identifies HTTP clients and SDKs
- ✅ Maps services to files
- ✅ Tracks cloud providers (AWS, GCP, Azure)

**Detection Rules:**
```typescript
interface ExternalLayerDetection {
  // TypeScript/JavaScript HTTP clients
  tsJsHttpClients: [
    'axios',
    'fetch',                     // Native fetch
    'node-fetch',
    'undici',
    'got',
    'superagent',
    'request',                   // Deprecated but still used
    'needle',
    'bent',
    'ky',
    'wretch'
  ]

  // Python HTTP clients
  pythonHttpClients: [
    'requests',
    'httpx',
    'aiohttp',
    'urllib',
    'urllib3',
    'urllib.request',
    'http.client',
    'httplib2'
  ]

  // Cloud Provider SDKs
  awsSdks: [
    '@aws-sdk/*',                // AWS SDK v3 (modular)
    'aws-sdk',                   // AWS SDK v2
    '@aws-sdk/client-s3',
    '@aws-sdk/client-dynamodb',
    '@aws-sdk/client-lambda',
    '@aws-sdk/client-sqs',
    '@aws-sdk/client-sns',
    'boto3',                     // Python AWS
    'aioboto3'                   // Async Python AWS
  ]

  gcpSdks: [
    '@google-cloud/*',
    '@google-cloud/storage',
    '@google-cloud/pubsub',
    '@google-cloud/firestore',
    'google-cloud-storage',      // Python
    'google-cloud-pubsub',
    'google-cloud-firestore'
  ]

  azureSdks: [
    '@azure/*',
    '@azure/storage-blob',
    '@azure/cosmos',
    '@azure/service-bus',
    'azure-storage-blob',        // Python
    'azure-cosmos',
    'azure-servicebus'
  ]

  // Payment processors
  paymentSdks: [
    'stripe',
    '@stripe/stripe-js',
    'paypal-rest-sdk',
    '@paypal/checkout-server-sdk',
    'braintree',
    'square',
    'adyen'
  ]

  // Communication/Messaging
  communicationSdks: [
    'twilio',
    '@twilio/conversations',
    'sendgrid',
    '@sendgrid/mail',
    'nodemailer',
    'mailgun-js',
    'postmark',
    '@slack/web-api',            // Slack
    '@slack/bolt',
    'discord.js',                // Discord
    'telegraf',                  // Telegram
    'whatsapp-web.js'
  ]

  // AI/ML Services
  aiSdks: [
    'openai',
    '@anthropic-ai/sdk',
    'anthropic',                 // Python
    'cohere-ai',
    '@google-ai/generativelanguage',
    'replicate',
    'huggingface',
    '@huggingface/inference'
  ]

  // Authentication/Identity
  authSdks: [
    'auth0',
    '@auth0/auth0-react',
    'passport',
    'passport-google-oauth20',
    'firebase-admin',
    'firebase/auth',
    '@supabase/supabase-js',
    '@clerk/nextjs',
    'next-auth',
    '@okta/okta-auth-js'
  ]

  // Analytics/Monitoring
  analyticsSdks: [
    '@segment/analytics-node',
    'mixpanel',
    'amplitude-js',
    '@sentry/node',
    '@sentry/browser',
    '@datadog/browser-rum',
    'newrelic',
    'bugsnag',
    'rollbar'
  ]

  // Storage/CDN
  storageSdks: [
    'cloudinary',
    '@cloudinary/url-gen',
    '@uploadcare/upload-client',
    'dropbox',
    'box-node-sdk',
    'onedrive-api'
  ]

  // Search
  searchSdks: [
    '@elastic/elasticsearch',
    'algoliasearch',
    '@algolia/client-search',
    'typesense',
    'meilisearch'
  ]

  // CRM/Sales
  crmSdks: [
    'salesforce',
    'jsforce',
    '@hubspot/api-client',
    'intercom-client',
    'zendesk-node-api'
  ]

  // Social Media
  socialSdks: [
    'twitter-api-v2',
    'facebook-nodejs-sdk',
    'instagram-private-api',
    'linkedin-api',
    'pinterest-api'
  ]

  // Message Queues / Event Systems
  messagingImports: [
    // RabbitMQ
    'amqplib',                   // Node.js RabbitMQ
    'amqp',
    'rabbitmq',
    'pika',                      // Python RabbitMQ
    'aio-pika',                  // Async Python RabbitMQ

    // Kafka
    'kafkajs',                   // Node.js Kafka
    'node-rdkafka',
    'kafka-python',              // Python Kafka
    'confluent-kafka',
    'aiokafka',                  // Async Python Kafka

    // Redis Pub/Sub & Queues
    'bull',                      // Redis-based queue (Node)
    'bee-queue',
    'bullmq',
    'kue',

    // AWS Messaging
    '@aws-sdk/client-sqs',       // AWS SQS
    '@aws-sdk/client-sns',       // AWS SNS
    '@aws-sdk/client-eventbridge',

    // Python Task Queues
    'celery',                    // Celery
    'rq',                        // Redis Queue
    'huey',

    // Google Pub/Sub
    '@google-cloud/pubsub',
    'google-cloud-pubsub',

    // Azure
    '@azure/service-bus',
    'azure-servicebus',

    // NATS
    'nats',
    'nats.py'
  ]

  // Code patterns (via tree-sitter)
  codePatterns: [
    // HTTP calls
    'axios.get(', 'axios.post(', 'axios.put(', 'axios.delete(',
    'fetch(',
    'requests.get(', 'requests.post(',
    'httpx.get(', 'httpx.post(',
    'aiohttp.ClientSession',

    // Common SDK initialization
    'new S3Client(',
    'Stripe(',
    'OpenAI(',
    'new Anthropic(',
    'SendGridClient(',
    'TwilioClient('
  ]

  // File patterns
  filePatterns: [
    '**/integrations/**',
    '**/external/**',
    '**/clients/**',
    '**/services/external/**',
    '**/third-party/**',
    '**/*client*.{ts,js,py}',
    '**/*integration*.{ts,js,py}',
    '**/*sdk*.{ts,js,py}'
  ]
}
```

**Output Structure:**
```json
{
  "layer": "external",
  "files": [
    {
      "filePath": "src/integrations/stripe.ts",
      "language": "typescript",
      "externalServices": [
        {
          "name": "stripe",
          "type": "payment",
          "sdk": "@stripe/stripe-js"
        }
      ],
      "functions": [...],
      "classes": [...],
      "imports": [...],
      "exports": [...],
      "calls": [...]
    }
  ],
  "externalServices": {
    "payment": ["stripe", "paypal"],
    "messaging": ["twilio", "sendgrid"],
    "cloud": ["aws-s3", "aws-sqs"],
    "ai": ["openai", "anthropic"],
    "analytics": ["segment", "mixpanel"]
  },
  "messageSystems": {
    "rabbitmq": {
      "library": "amqplib",
      "files": ["src/messaging/publisher.ts", "src/messaging/consumer.ts"],
      "type": "message-queue"
    },
    "kafka": {
      "library": "kafkajs",
      "files": ["src/events/producer.ts"],
      "type": "event-stream"
    },
    "redis-queue": {
      "library": "bull",
      "files": ["src/jobs/queue.ts"],
      "type": "task-queue"
    }
  },
  "summary": {
    "totalFiles": 23,
    "totalExternalServices": 8,
    "totalMessageSystems": 3,
    "serviceTypes": ["payment", "messaging", "cloud", "ai", "analytics"],
    "messagingTypes": ["message-queue", "event-stream", "task-queue"]
  }
}
```

#### 4. Service Layer (`service-layer/`)
**Purpose:** Business logic, utilities, and files not in other layers

**Output Files:**
- `summary.json`: File list, metrics (pretty-printed)
- `chunk-*.json`: Full file analysis for files in this layer (minified)

**Detection Rules:**
```typescript
interface ServiceLayerDetection {
  // Default layer for files that don't match data/api/external
  isDefault: true

  // File patterns (common business logic locations)
  filePatterns: [
    '**/services/**',
    '**/business/**',
    '**/logic/**',
    '**/domain/**',
    '**/utils/**',
    '**/helpers/**',
    '**/lib/**'
  ]
}
```

**Output Structure:**
```json
{
  "layer": "service",
  "files": [
    {
      "filePath": "src/services/user-service.ts",
      "language": "typescript",
      "functions": [...],
      "classes": [...],
      "imports": [...],
      "exports": [...],
      "calls": [...]
    }
  ],
  "summary": {
    "totalFiles": 89,
    "totalFunctions": 234,
    "totalClasses": 45
  }
}
```

---

## Cross-Layer Dependencies

### Tracking Layer Relationships

Each layer file includes **two types of dependencies**:

#### 1. Internal Dependencies (same layer)
Dependencies between files within the same layer:

```json
{
  "layer": "api",
  "dependencies": [
    {
      "source": "src/api/users/routes.ts",
      "target": "src/api/users/validators.ts",
      "importedNames": ["validateUserInput"],
      "type": "internal"
    }
  ]
}
```

#### 2. Cross-Layer Dependencies
Dependencies from this layer to other layers:

```json
{
  "layer": "api",
  "crossLayerDependencies": [
    {
      "source": "src/api/users/routes.ts",
      "target": "src/services/user-service.ts",
      "targetLayer": "service",
      "importedNames": ["UserService"],
      "type": "uses",
      "direction": "api -> service"
    },
    {
      "source": "src/api/users/routes.ts",
      "target": "src/models/user.py",
      "targetLayer": "data",
      "importedNames": ["User"],
      "type": "uses",
      "direction": "api -> data"
    }
  ]
}
```

### Typical Dependency Flows

**Clean Architecture Pattern:**
```
External Layer ──uses──> Service Layer ──uses──> Data Layer
     ↓                        ↓                       ↓
   (calls)               (orchestrates)           (queries)
     ↓                        ↓                       ↓
API Layer ────uses────> Service Layer ──uses──> Data Layer
```

**Common Flow Examples:**

1. **API → Service → Data** (Clean)
   ```
   routes.ts (API) → user-service.ts (Service) → user.model.ts (Data)
   ```

2. **API → Data** (Direct - potential code smell)
   ```
   routes.ts (API) → user.model.ts (Data)
   ```

3. **External → Service → Data** (Clean)
   ```
   stripe-client.ts (External) → payment-service.ts (Service) → payment.model.ts (Data)
   ```

### Why Track Cross-Layer Dependencies?

1. **Architecture Validation**: Detect violations of layered architecture (e.g., Data layer calling API layer)
2. **Impact Analysis**: Understand what breaks when you change a file
3. **Diagram Generation**: Create accurate flow diagrams showing data flow
4. **Code Smells**: Identify anti-patterns like:
   - API layer directly accessing database (skipping service layer)
   - Data layer importing from API layer (reversed dependency)
   - Circular dependencies between layers

### Global Dependency Graph

The root `metadata.json` includes a **cross-layer dependency summary**:

```json
{
  "metadata": {...},
  "services": [...],
  "layers": {...},
  "crossLayerDependencies": {
    "api -> service": 45,
    "api -> data": 12,        // Potential code smell
    "service -> data": 78,
    "service -> external": 34,
    "external -> service": 5,
    "data -> service": 2      // Architecture violation!
  },
  "violations": [
    {
      "type": "reversed-dependency",
      "from": "data",
      "to": "service",
      "files": [
        {
          "source": "src/models/user.py",
          "target": "src/services/notification.ts",
          "reason": "Data layer should not depend on service layer"
        }
      ]
    }
  ]
}
```

---

## Service Detection

### Service Detection Heuristics

The analyzer automatically detects all services in the codebase:

#### 1. Monorepo Structure Detection
```typescript
interface MonorepoPatterns {
  // Package managers
  packageFiles: [
    'package.json',      // Node.js
    'pyproject.toml',    // Python
    'Cargo.toml',        // Rust
    'go.mod'             // Go
  ]

  // Common monorepo directories
  serviceDirs: [
    'packages/*',
    'services/*',
    'apps/*',
    'microservices/*'
  ]

  // Lerna/Nx/Turborepo
  monorepoConfigs: [
    'lerna.json',
    'nx.json',
    'turbo.json',
    'pnpm-workspace.yaml'
  ]
}
```

#### 2. Entry Point Detection
```typescript
interface EntryPointDetection {
  // Multiple main files indicate multiple services
  entryPoints: [
    'main.py',
    'index.ts',
    'index.js',
    'app.py',
    'server.ts',
    '__main__.py'
  ]

  // Server startup patterns (via tree-sitter)
  serverPatterns: [
    'app.listen(',
    'uvicorn.run(',
    'app.run(',
    'fastapi.FastAPI(',
    'express()'
  ]
}
```

#### 3. Docker/Container Detection
```typescript
interface ContainerDetection {
  // Docker compose
  dockerCompose: 'docker-compose.yml' | 'docker-compose.yaml'

  // Multiple Dockerfiles
  dockerfiles: [
    'Dockerfile',
    'Dockerfile.*',
    '*/Dockerfile'
  ]

  // Kubernetes
  k8sPatterns: [
    'k8s/**/*.yaml',
    'deployment.yaml',
    'service.yaml'
  ]
}
```

#### 4. Service Naming Strategy
```typescript
function detectServiceName(rootDir: string): string {
  // Priority order:
  // 1. package.json "name" field
  // 2. Directory name
  // 3. Docker compose service name
  // 4. Main file prefix (e.g., "api-server.ts" → "api-server")

  // Examples:
  // packages/api-gateway → "api-gateway"
  // services/workers → "workers"
  // apps/frontend → "frontend"
}
```

### Service Output Structure

```json
{
  "service": "api-gateway",
  "rootPath": "services/api-gateway",
  "entryPoint": "src/main.ts",
  "type": "api-server",
  "framework": "fastapi",
  "port": 8000,
  "dependencies": ["core-service", "worker-service"],
  "layers": {
    "data": { /* data-layer.json content */ },
    "api": { /* api-layer.json content */ },
    "service": { /* service-layer.json content */ },
    "external": { /* external-layer.json content */ }
  }
}
```

---

## Root Metadata File

**File:** `.specmind/analysis/metadata.json`

```json
{
  "analyzedAt": "2025-01-23T16:30:00Z",
  "rootPath": "/path/to/project",
  "architecture": "microservices" | "monolith",
  "services": [
    {
      "name": "api-gateway",
      "path": "services/api-gateway",
      "type": "api-server",
      "filesAnalyzed": 45,
      "layers": ["data", "api", "service", "external"]
    },
    {
      "name": "worker-service",
      "path": "services/workers",
      "type": "worker",
      "filesAnalyzed": 23,
      "layers": ["data", "service", "external"]
    }
  ],
  "layers": {
    "data": {
      "filesAnalyzed": 34,
      "databases": ["postgresql", "redis"],
      "totalModels": 28
    },
    "api": {
      "filesAnalyzed": 56,
      "totalEndpoints": 89,
      "frameworks": ["fastapi", "express"]
    },
    "service": {
      "filesAnalyzed": 123,
      "totalFunctions": 456,
      "totalClasses": 89
    },
    "external": {
      "filesAnalyzed": 45,
      "services": ["stripe", "sendgrid", "aws-s3"]
    }
  },
  "totals": {
    "filesAnalyzed": 258,
    "totalFunctions": 1234,
    "totalClasses": 234,
    "totalCalls": 5678,
    "languages": ["typescript", "python"]
  }
}
```

---

## CLI Interface

### Command

```bash
specmind analyze [options]
```

### Options

```typescript
interface AnalyzeOptions {
  path?: string           // Path to analyze (default: current directory)
  outputDir?: string      // Output directory (default: '.specmind/analysis')
}
```

### Usage Examples

```bash
# Analyze current directory
specmind analyze

# Analyze specific directory
specmind analyze --path ./src

# Custom output directory
specmind analyze --output-dir ./docs/architecture

# Analyze from project root
cd /path/to/project
specmind analyze
```

### Output Behavior

**Every `analyze` command produces:**
```
.specmind/analysis/
├── metadata.json                    # Always generated
├── services/{service}/              # One or more services
│   ├── metadata.json
│   └── {layer}.json                 # One or more layers per service
└── layers/{layer}.json              # Cross-service view
```

**No flags needed** - the structure is determined by what's detected in your codebase.

---

## Implementation Strategy

### Detection Configuration Files

**All detection patterns are stored in separate JSON/YAML configuration files** for easy maintenance and updates.

#### Configuration Structure

```
packages/core/src/analyzer/patterns/
├── data-layer.json         # Data layer detection patterns
├── api-layer.json          # API layer detection patterns
├── external-layer.json     # External layer detection patterns
└── databases.json          # Database type mappings
```

#### Example: `data-layer.json`

```json
{
  "orms": {
    "typescript": [
      "prisma",
      "@prisma/client",
      "typeorm",
      "mikro-orm",
      "@mikro-orm/core",
      "sequelize",
      "mongoose",
      "drizzle-orm",
      "kysely"
    ],
    "python": [
      "sqlalchemy",
      "sqlalchemy.orm",
      "django.db",
      "django.db.models",
      "tortoise",
      "peewee",
      "mongoengine"
    ]
  },
  "drivers": {
    "postgresql": {
      "typescript": ["pg", "pg-promise", "postgres"],
      "python": ["psycopg2", "psycopg", "asyncpg"]
    },
    "mysql": {
      "typescript": ["mysql", "mysql2"],
      "python": ["pymysql", "aiomysql", "mysqlclient"]
    },
    "redis": {
      "typescript": ["redis", "ioredis", "@redis/client"],
      "python": ["redis", "aioredis"]
    },
    "mongodb": {
      "typescript": ["mongodb", "mongoose"],
      "python": ["pymongo", "motor"]
    }
  },
  "filePatterns": [
    "**/*model*.{ts,js,py}",
    "**/*schema*.{ts,js,py}",
    "**/models/**",
    "**/schemas/**",
    "**/entities/**",
    "**/migrations/**"
  ],
  "codePatterns": [
    "@Entity",
    "@Column",
    "declarative_base",
    "models.Model",
    "Schema("
  ]
}
```

#### Example: `databases.json`

```json
{
  "postgresql": {
    "drivers": ["pg", "pg-promise", "postgres", "psycopg2", "psycopg", "asyncpg"],
    "orms": ["typeorm", "prisma", "sequelize", "sqlalchemy"],
    "color": "#336791",
    "icon": "[(PostgreSQL)]"
  },
  "mysql": {
    "drivers": ["mysql", "mysql2", "pymysql", "aiomysql"],
    "orms": ["typeorm", "sequelize", "sqlalchemy"],
    "color": "#4479A1",
    "icon": "[(MySQL)]"
  },
  "redis": {
    "drivers": ["redis", "ioredis", "@redis/client", "aioredis"],
    "orms": [],
    "color": "#DC382D",
    "icon": "[(Redis)]"
  },
  "mongodb": {
    "drivers": ["mongodb", "pymongo", "motor"],
    "orms": ["mongoose", "mongoengine"],
    "color": "#47A248",
    "icon": "[(MongoDB)]"
  }
}
```

#### Example: `external-layer.json`

```json
{
  "httpClients": {
    "typescript": ["axios", "fetch", "node-fetch", "got", "ky"],
    "python": ["requests", "httpx", "aiohttp"]
  },
  "services": {
    "payment": {
      "stripe": ["stripe", "@stripe/stripe-js"],
      "paypal": ["paypal-rest-sdk", "@paypal/checkout-server-sdk"],
      "square": ["square"],
      "braintree": ["braintree"]
    },
    "cloud": {
      "aws": ["@aws-sdk/*", "aws-sdk", "boto3", "aioboto3"],
      "gcp": ["@google-cloud/*", "google-cloud-*"],
      "azure": ["@azure/*", "azure-*"]
    },
    "ai": {
      "openai": ["openai"],
      "anthropic": ["@anthropic-ai/sdk", "anthropic"],
      "cohere": ["cohere-ai"],
      "huggingface": ["@huggingface/inference"]
    },
    "messaging": {
      "twilio": ["twilio"],
      "sendgrid": ["sendgrid", "@sendgrid/mail"],
      "slack": ["@slack/web-api", "@slack/bolt"]
    }
  },
  "messageQueues": {
    "rabbitmq": {
      "typescript": ["amqplib", "amqp"],
      "python": ["pika", "aio-pika"],
      "type": "message-queue"
    },
    "kafka": {
      "typescript": ["kafkajs", "node-rdkafka"],
      "python": ["kafka-python", "confluent-kafka", "aiokafka"],
      "type": "event-stream"
    },
    "celery": {
      "python": ["celery"],
      "type": "task-queue"
    },
    "bull": {
      "typescript": ["bull", "bullmq"],
      "type": "task-queue"
    }
  }
}
```

### Benefits of Configuration Files

1. **Easy Updates**: Add new frameworks without code changes
2. **Community Contributions**: Users can submit PRs with new patterns
3. **Versioning**: Track pattern changes in git
4. **Language Separation**: Easy to see TypeScript vs Python patterns
5. **Documentation**: Config files serve as documentation
6. **Testing**: Easy to test pattern matching with fixtures
7. **Extensibility**: Users can override/extend patterns locally

### Loading Configuration

```typescript
// File: packages/core/src/analyzer/pattern-loader.ts

import dataLayerPatterns from './patterns/data-layer.json'
import apiLayerPatterns from './patterns/api-layer.json'
import externalLayerPatterns from './patterns/external-layer.json'
import databaseMappings from './patterns/databases.json'

export interface PatternConfig {
  data: typeof dataLayerPatterns
  api: typeof apiLayerPatterns
  external: typeof externalLayerPatterns
  databases: typeof databaseMappings
}

export function loadPatterns(): PatternConfig {
  return {
    data: dataLayerPatterns,
    api: apiLayerPatterns,
    external: externalLayerPatterns,
    databases: databaseMappings
  }
}

// Allow custom patterns (future feature)
export function loadPatternsWithOverrides(customPath?: string): PatternConfig {
  const defaults = loadPatterns()

  if (customPath && existsSync(customPath)) {
    const custom = JSON.parse(readFileSync(customPath, 'utf8'))
    return deepMerge(defaults, custom)
  }

  return defaults
}
```

### Usage in Layer Detector

```typescript
// File: packages/core/src/analyzer/layer-detector.ts

import { loadPatterns } from './pattern-loader.js'

const patterns = loadPatterns()

export function detectLayers(analysis: FileAnalysis): LayerDetectionResult {
  const layers: Layer[] = []

  // Data layer detection using config
  if (hasDataLayerPatterns(analysis, patterns.data)) {
    layers.push('data')
  }

  // API layer detection using config
  if (hasAPILayerPatterns(analysis, patterns.api)) {
    layers.push('api')
  }

  // External layer detection using config
  if (hasExternalLayerPatterns(analysis, patterns.external)) {
    layers.push('external')
  }

  // Default to service layer
  if (layers.length === 0) {
    layers.push('service')
  }

  return { layers, confidence: 1.0, reasons: [] }
}

function hasDataLayerPatterns(analysis: FileAnalysis, config: any): boolean {
  // Check ORMs
  const allOrms = [...config.orms.typescript, ...config.orms.python]
  if (analysis.imports.some(imp => allOrms.includes(imp.source))) {
    return true
  }

  // Check drivers
  const allDrivers = Object.values(config.drivers)
    .flatMap((db: any) => [...db.typescript, ...db.python])
  if (analysis.imports.some(imp => allDrivers.includes(imp.source))) {
    return true
  }

  return false
}
```

### Future: User-Customizable Patterns

Allow users to extend patterns via `.specmind/patterns.json`:

```json
{
  "data": {
    "orms": {
      "typescript": ["my-custom-orm"]
    }
  },
  "external": {
    "services": {
      "custom": {
        "my-internal-api": ["@company/api-client"]
      }
    }
  }
}
```

---

### Core Implementation

The analyze command will be completely rewritten to output the split structure by default.

```typescript
// File: packages/core/src/analyzer/layer-detector.ts

export type Layer = 'data' | 'api' | 'service' | 'external'

export interface LayerDetectionResult {
  layers: Layer[]  // A file can belong to multiple layers
  confidence: number
  reasons: string[]
}

export function detectLayers(analysis: FileAnalysis): LayerDetectionResult {
  const layers: Layer[] = []
  const reasons: string[] = []

  // Check data layer
  if (hasDataLayerPatterns(analysis)) {
    layers.push('data')
    reasons.push('Contains ORM imports or model definitions')
  }

  // Check API layer
  if (hasAPILayerPatterns(analysis)) {
    layers.push('api')
    reasons.push('Contains route decorators or API definitions')
  }

  // Check external layer
  if (hasExternalLayerPatterns(analysis)) {
    layers.push('external')
    reasons.push('Contains HTTP client or SDK imports')
  }

  // Default to service layer
  if (layers.length === 0) {
    layers.push('service')
    reasons.push('Business logic or utility file')
  }

  return {
    layers,
    confidence: calculateConfidence(layers, analysis),
    reasons
  }
}
```

### Service Detection Logic

```typescript
// File: packages/core/src/analyzer/service-detector.ts

export interface Service {
  name: string
  rootPath: string
  entryPoint?: string
  type: 'api-server' | 'worker' | 'frontend' | 'library' | 'unknown'
  framework?: string
  files: string[]  // Absolute paths
}

export function detectServices(rootPath: string, allFiles: string[]): Service[] {
  const services: Service[] = []

  // 1. Check for monorepo structure
  const monorepoServices = detectMonorepoServices(rootPath, allFiles)
  if (monorepoServices.length > 0) {
    return monorepoServices
  }

  // 2. Check for multiple entry points
  const entryPointServices = detectByEntryPoints(rootPath, allFiles)
  if (entryPointServices.length > 1) {
    return entryPointServices
  }

  // 3. Check Docker compose
  const dockerServices = detectDockerComposeServices(rootPath)
  if (dockerServices.length > 0) {
    return dockerServices
  }

  // 4. Default: Single service (monolith)
  return [{
    name: path.basename(rootPath),
    rootPath,
    type: 'unknown',
    files: allFiles
  }]
}
```

### Output Generator (CLI Logic)

```typescript
// File: packages/cli/src/commands/analyze.ts

export async function analyzeCommand(options: AnalyzeOptions) {
  const allFiles = getAllFiles(options.path)
  const analyses = await analyzeAllFiles(allFiles)
  const outputDir = options.outputDir || '.specmind/analysis'

  // 1. Detect services
  const services = detectServices(options.path, allFiles)
  const isMultiService = services.length > 1

  // 2. For each service, split by layers
  for (const service of services) {
    const serviceAnalyses = analyses.filter(a =>
      service.files.includes(a.filePath)
    )

    const layers = splitByLayers(serviceAnalyses)
    await writeServiceLayers(outputDir, service.name, layers)
  }

  // 3. Create cross-service layer view
  const globalLayers = splitByLayers(analyses)
  await writeGlobalLayers(outputDir, globalLayers)

  // 4. Write metadata
  await writeMetadata(outputDir, {
    services,
    architecture: isMultiService ? 'microservices' : 'monolith',
    analyzedAt: new Date().toISOString()
  })

  console.log(`✅ Analysis complete: ${outputDir}`)
  console.log(`   Services: ${services.length}`)
  console.log(`   Files: ${analyses.length}`)
}

interface LayerOutput {
  files: FileAnalysis[]
  dependencies: ModuleDependency[]           // Same-layer dependencies
  crossLayerDependencies: CrossLayerDependency[]  // Cross-layer dependencies
  summary: LayerSummary
}

interface CrossLayerDependency {
  source: string
  target: string
  targetLayer: Layer
  importedNames: string[]
  type: 'uses'
  direction: string  // e.g., "api -> service"
}

function splitByLayers(
  analyses: FileAnalysis[],
  allDependencies: ModuleDependency[]
): Record<Layer, LayerOutput> {

  // 1. Categorize files into layers
  const fileLayerMap = new Map<string, Layer[]>()
  for (const analysis of analyses) {
    const detection = detectLayers(analysis)
    fileLayerMap.set(analysis.filePath, detection.layers)
  }

  // 2. Build layer outputs
  const layers: Record<Layer, LayerOutput> = {
    data: { files: [], dependencies: [], crossLayerDependencies: [], summary: {} },
    api: { files: [], dependencies: [], crossLayerDependencies: [], summary: {} },
    service: { files: [], dependencies: [], crossLayerDependencies: [], summary: {} },
    external: { files: [], dependencies: [], crossLayerDependencies: [], summary: {} }
  }

  // 3. Assign files to layers
  for (const analysis of analyses) {
    const fileLayers = fileLayerMap.get(analysis.filePath) || []
    for (const layer of fileLayers) {
      layers[layer].files.push(analysis)
    }
  }

  // 4. Categorize dependencies
  for (const dep of allDependencies) {
    const sourceLayers = fileLayerMap.get(dep.source) || []
    const targetLayers = fileLayerMap.get(dep.target) || []

    for (const sourceLayer of sourceLayers) {
      // Check if same layer or cross-layer
      if (targetLayers.includes(sourceLayer)) {
        // Internal dependency (same layer)
        layers[sourceLayer].dependencies.push(dep)
      } else {
        // Cross-layer dependency
        for (const targetLayer of targetLayers) {
          layers[sourceLayer].crossLayerDependencies.push({
            source: dep.source,
            target: dep.target,
            targetLayer,
            importedNames: dep.importedNames,
            type: 'uses',
            direction: `${sourceLayer} -> ${targetLayer}`
          })
        }
      }
    }
  }

  return layers
}
```

---

## File Structure After Implementation

```
packages/
├── core/
│   └── src/
│       └── analyzer/
│           ├── layer-detector.ts       # NEW: Layer detection logic
│           ├── service-detector.ts     # NEW: Service detection logic
│           └── ...
└── cli/
    └── src/
        └── commands/
            └── analyze.ts              # COMPLETELY REWRITTEN: Always output split structure
```

---

## Testing Strategy

### Unit Tests

```typescript
// packages/core/src/__tests__/layer-detector.test.ts
describe('detectLayers', () => {
  it('should detect data layer from ORM imports', () => {
    const analysis = {
      imports: [{ source: '@prisma/client', ... }],
      // ...
    }
    const result = detectLayers(analysis)
    expect(result.layers).toContain('data')
  })

  it('should detect API layer from route decorators', () => {
    const analysis = {
      functions: [{ name: 'getUser', decorators: ['@Get'] }],
      // ...
    }
    const result = detectLayers(analysis)
    expect(result.layers).toContain('api')
  })
})

// packages/core/src/__tests__/service-detector.test.ts
describe('detectServices', () => {
  it('should detect monorepo services', () => {
    // Mock file structure with packages/*/package.json
    const services = detectServices('/root', files)
    expect(services).toHaveLength(3)
    expect(services[0].name).toBe('api-gateway')
  })

  it('should detect single service for monolith', () => {
    const services = detectServices('/root', files)
    expect(services).toHaveLength(1)
  })
})
```

### Integration Tests

```bash
# Test monolith project
cd test-fixtures/monolith
specmind analyze
# Verify:
#   .specmind/analysis/metadata.json exists
#   .specmind/analysis/services/monolith/*.json exists
#   .specmind/analysis/layers/*.json exists

# Test multi-service project
cd test-fixtures/microservices
specmind analyze
# Verify:
#   .specmind/analysis/metadata.json shows architecture: "microservices"
#   .specmind/analysis/services/api-gateway/*.json exists
#   .specmind/analysis/services/worker/*.json exists
#   .specmind/analysis/layers/*.json contains cross-service data

# Test custom output directory
specmind analyze --output-dir ./custom
# Verify: ./custom/metadata.json exists
```

---

## Future Enhancements

### 1. Smart Layer Assignment
- Use ML/heuristics to improve layer detection accuracy
- Support custom layer definitions via config

### 2. Dependency Graph
- Show dependencies between services
- Show dependencies between layers

### 3. Visual Output
- Generate Mermaid diagrams per service
- Generate system-level service diagram
- Generate layer interaction diagrams

### 4. Incremental Analysis
- Only re-analyze changed services
- Cache analysis results
- Git-aware analysis (only changed files)

---

## Success Metrics

1. **Context Window Fit**: Each output file < 50KB (fits in Claude/GPT context)
2. **Accurate Detection**: >90% accuracy for layer/service detection on sample projects
3. **Performance**: Analysis time < 10s for projects with 1000+ files
4. **Usability**: Clear directory structure, no configuration needed

---

## Implementation Notes

- Files can belong to multiple layers (e.g., a controller that also makes external API calls)
- Service detection should be conservative (prefer monolith over false multi-service detection)
- Layer detection should be aggressive (better to over-categorize than under-categorize)
- Always provide a `metadata.json` for easy discovery of split structure
- Empty layers are still created (with empty `files: []` array) for consistency
---

## Feature Summary

### ✅ Implemented

#### Multi-Service Detection
- Monorepo structure detection (packages/, services/, apps/)
- Entry point detection (main.py, index.ts, package.json)
- Docker compose parsing
- Service-specific output directories

#### Layer Detection with Enhanced Features

**Data Layer**
- 27 ORMs detected (Prisma, TypeORM, SQLAlchemy, Mongoose, etc.)
- 28 database drivers detected (PostgreSQL, MySQL, Redis, MongoDB, etc.)
- Database type identification per file
- ORM-to-database mapping
- Model/schema file detection

**API Layer**
- 32 frameworks detected (Express, NestJS, FastAPI, Flask, etc.)
- Endpoint extraction (method, path, handler, location)
- REST, GraphQL, tRPC, gRPC support
- HTTP method counting (GET, POST, PUT, DELETE)

**External Layer**
- 100+ SDKs/packages detected
- Service categorization (payment, messaging, cloud, AI, analytics, etc.)
- Message queue detection (RabbitMQ, Kafka, SQS, Celery, Bull, etc.)
- Cloud provider tracking (AWS, GCP, Azure)

**Service Layer**
- Default for business logic
- Catches all non-categorized files

#### Cross-Layer Dependencies
- Internal dependencies (same layer)
- Cross-layer dependencies with direction tracking
- Architecture violation detection
- Dependency flow analysis

---

## Detection Coverage

| Category | Count | Examples |
|----------|-------|----------|
| **ORMs** | 27 | Prisma, TypeORM, SQLAlchemy, Mongoose, Drizzle |
| **Database Drivers** | 28 | pg, mysql2, psycopg2, redis, mongodb |
| **API Frameworks** | 32 | Express, NestJS, FastAPI, Flask, Next.js |
| **HTTP Clients** | 18 | axios, fetch, requests, httpx |
| **Cloud SDKs** | 18 | AWS SDK, Google Cloud, Azure |
| **Payment SDKs** | 7 | Stripe, PayPal, Braintree, Square |
| **AI SDKs** | 8 | OpenAI, Anthropic, Cohere, HuggingFace |
| **Message Queues** | 25 | RabbitMQ, Kafka, SQS, Celery, Bull |
| **Auth SDKs** | 10 | Auth0, Firebase, Supabase, NextAuth |
| **Analytics** | 9 | Segment, Mixpanel, Sentry, Datadog |

**Total Packages/Tools: 180+**

---

## Out of Scope (Future)

- Configuration/secrets detection
- Authentication pattern analysis
- Frontend framework detection
- Deployment/infrastructure detection
- LLM-enhanced detection
