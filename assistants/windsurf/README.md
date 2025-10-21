# SpecMind for Windsurf

This directory contains Cascade rules for using SpecMind in Windsurf IDE.

## Installation

```bash
# From your project root
npx specmind setup windsurf
```

This will copy the `.windsurf/rules/` directory to your project root.

## Available Rules

Windsurf uses "rules" that you activate with @mentions. SpecMind provides three rules:

- **@specmind-analyze** - Analyze your codebase and create system architecture documentation
- **@specmind-design** - Design a new feature with architecture spec
- **@specmind-implement** - Implement a feature based on its spec

## How to Use

1. **Analyze your codebase:**
   ```
   @specmind-analyze
   ```
   This will create `.specmind/system.sm` with your system architecture.

2. **Design a new feature:**
   ```
   @specmind-design User Authentication with OAuth2 support
   ```
   This will create `.specmind/features/user-authentication.sm` with the feature specification.

3. **Implement the feature:**
   ```
   @specmind-implement User Authentication
   ```
   This will implement the code based on the specification and update system.sm.

## How It Works

Each rule file (`.windsurf/rules/specmind-*.md`) contains the complete prompt template from the shared SpecMind instructions. Windsurf's Cascade AI reads these rules when you @mention them and follows the instructions to:

1. Run the SpecMind CLI tool
2. Generate Mermaid diagrams
3. Create/update .sm specification files
4. Implement code following the architecture

The rules ensure consistency with SpecMind's architecture-first approach across all AI assistants.
