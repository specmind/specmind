# Task Management - Python Implementation

This is a Python implementation of the task management system, demonstrating a microservices architecture with three services.

## Architecture

This example demonstrates:
- **Multi-service architecture** (3 services)
- **Layered architecture** (data, service, api, external layers)
- **Cross-service communication** (HTTP + Redis queue)
- **Multiple frameworks** (FastAPI, Flask, Celery)
- **Multiple databases** (PostgreSQL, Redis)

## Services

### 1. API Service (FastAPI)
- **Port**: 3000
- **Framework**: FastAPI
- **Databases**: PostgreSQL (SQLAlchemy), Redis (caching)
- **Layers**:
  - `data/`: Database models, repositories, cache
  - `service/`: Business logic (TaskService)
  - `api/`: REST endpoints (tasks, users)
  - `external/`: HTTP clients (email service), queue clients

### 2. Email Service (Flask)
- **Port**: 3001
- **Framework**: Flask
- **Layers**:
  - `service/`: Email sending logic (SMTP)
  - `api/`: REST endpoints
  - `external/`: HTTP client (API service)

### 3. Worker Service (Celery)
- **Framework**: Celery (background jobs)
- **Queue**: Redis
- **Layers**:
  - `service/`: Background tasks
  - `external/`: HTTP clients (API service, email service)

## Cross-Service Dependencies

```
API Service → Email Service (HTTP)
API Service → Worker Service (Redis queue)
Worker Service → API Service (HTTP)
Worker Service → Email Service (HTTP)
```

## Running the Services

### Prerequisites
```bash
# Install dependencies for each service
cd api-service && pip install -r requirements.txt
cd email-service && pip install -r requirements.txt
cd worker-service && pip install -r requirements.txt
```

### Start Services
```bash
# Terminal 1: API Service
cd api-service
python -m src.main

# Terminal 2: Email Service
cd email-service
python -m src.app

# Terminal 3: Worker Service
cd worker-service
celery -A src.celery_app worker --loglevel=info
```

## Testing SpecMind

Run the analyze command on each service:

```bash
# Analyze API service
specmind analyze --path api-service

# Analyze email service
specmind analyze --path email-service

# Analyze worker service
specmind analyze --path worker-service
```

SpecMind should detect:
- 3 services with correct types (api-server, api-server, worker)
- FastAPI, Flask, and Celery frameworks
- PostgreSQL and Redis databases
- Cross-service HTTP calls
- Redis queue usage
- Layered architecture (data, service, api, external)
