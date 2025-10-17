# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Primary Source of Truth:** [CONSTITUTION.md](./CONSTITUTION.md)

This project uses **CONSTITUTION.md** as the definitive source of architectural decisions, principles, and constraints. You MUST read and follow it for all development tasks.

---

## Quick Reference

**Before Starting:** Read [CONSTITUTION.md](./CONSTITUTION.md) - especially relevant sections for your task.

**Key Points:**
- TypeScript only, strict mode (Section 2.2)
- Tree-sitter for all code parsing (Section 2.3)
- .sm files = markdown + Mermaid diagrams (Section 4.2)
- Monorepo with pnpm workspaces (Section 2.1)

---

## Build Commands

### Monorepo Commands (from root):
```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests across all packages
pnpm test

# Lint all packages
pnpm lint

# Clean all build outputs and node_modules
pnpm clean
```

### Package Development:
```bash
# Work on specific package
cd packages/core
pnpm build      # Build package
pnpm test       # Test package
pnpm lint       # Lint package
```

## Development Guidelines

**Essential Rules:**
- Zero type errors tolerated (see tsconfig.base.json)
- Use Zod for schemas and validation
- All code parsing via tree-sitter only
- Coverage > 80% for tests

**Decision Process:**
1. Check CONSTITUTION.md alignment first
2. Update CONSTITUTION.md for new architectural decisions
3. Update README.md for user-facing changes (per Section 9.4)

---

## File Naming (.sm files)

- **Root:** `system.sm`
- **Features:** Kebab-case: "User Auth" → `user-authentication.sm`
- **No timestamps** - use git history for versioning

See **CONSTITUTION.md Section 4.2** for complete specification.

---

## Testing

```bash
# All packages
pnpm test

# Specific package
cd packages/core && pnpm test

# Watch mode
cd packages/core && pnpm test --watch
```

Uses Vitest. See **CONSTITUTION.md Section 6.4** for strategy details.

---

## Common Patterns

### Slugify Feature Name:
```typescript
function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
```

### Tree-sitter Setup:
```typescript
import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'

const parser = new Parser()
parser.setLanguage(TypeScript)
const tree = parser.parse(sourceCode)
```

### Zod Schema Pattern:
```typescript
import { z } from 'zod'

const FeatureSchema = z.object({
  name: z.string(),
  type: z.enum(['feature', 'service'])
})
```

---

## Current Project Status

This is an **early-stage project** with the following status:
- ✅ Project structure and constitution established
- ✅ Monorepo setup with pnpm workspaces
- ✅ TypeScript configuration (strict mode)
- ⚠️ Package implementations are **stubs** - core functionality not yet built
- ⚠️ No tree-sitter integration implemented yet
- ⚠️ No .sm format parser implemented yet

**Current Implementation Priority:**
1. Implement `@specmind/format` package (Zod schemas + parser)
2. Implement `@specmind/core` package (tree-sitter analysis)
3. Implement basic CLI commands in `@specmind/cli`
4. Build VS Code extension for .sm file viewing

## Remember

🎯 **CONSTITUTION.md is the source of truth** - read it first
📝 **Keep README.md in sync** for user-facing changes
🚫 **Non-negotiables are non-negotiable** (Section 8)

👉 **[Read CONSTITUTION.md](./CONSTITUTION.md)** for complete details
