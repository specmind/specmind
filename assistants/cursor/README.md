# SpecMind for Cursor

SpecMind integrates with Cursor using custom prompts in the `.cursor/prompts/` directory.

## Installation

From your project root:

```bash
npx specmind setup cursor
```

This will copy the SpecMind prompts to `.cursor/prompts/` in your project.

## Available Commands

### `/analyze` - Analyze Codebase

Analyzes your entire codebase and generates architecture documentation in `.specmind/system/`.

**Usage:**
1. Open Cursor Chat (Cmd/Ctrl + L)
2. Type `@analyze`
3. Follow the prompts

**What it does:**
- Detects services (monolith or microservices)
- Extracts API endpoints, database models, message queues
- Generates architectural diagrams (Mermaid)
- Creates `.specmind/system/` with full analysis

### `/design <feature-name>` - Design Feature

Designs a new feature with a complete architecture spec before implementation.

**Usage:**
1. Open Cursor Chat
2. Type `@design user-authentication`
3. Describe what you want to build

**What it does:**
- Creates `.specmind/features/<feature-name>.sm`
- Generates Mermaid diagrams for the feature
- Documents data models, API contracts, dependencies
- Provides implementation plan

### `/implement <feature-name>` - Implement Feature

Implements a feature based on its existing `.sm` spec file.

**Usage:**
1. Open Cursor Chat
2. Type `@implement user-authentication`
3. The AI will follow the architecture spec

**What it does:**
- Reads `.specmind/features/<feature-name>.sm`
- Implements code following the documented architecture
- Creates all necessary files (models, routes, services, tests)
- Ensures alignment with existing system architecture

## Tips

- Run `/analyze` first to understand your codebase
- Use `/design` before building new features
- Reference `.specmind/` files in your prompts for architectural context
- Update `.sm` files as your system evolves

## File Structure

After setup, your project will have:

```
your-project/
├── .cursor/
│   └── prompts/
│       ├── analyze.md
│       ├── design.md
│       └── implement.md
└── .specmind/           # Generated after /analyze
    ├── system/          # Full system analysis
    └── features/        # Feature specs (after /design)
```

## Learn More

- [SpecMind Documentation](https://github.com/specmind/specmind)
- [.sm File Format](https://github.com/specmind/specmind/blob/main/CONSTITUTION.md)
