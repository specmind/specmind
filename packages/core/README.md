# @specmind/core

Core code analysis and architecture generation library for SpecMind using tree-sitter.

## Overview

`@specmind/core` provides pure logic for analyzing codebases and extracting architectural information. It uses [tree-sitter](https://tree-sitter.github.io/) for robust, language-agnostic code parsing and analysis.

**Key Features:**
- **Multi-language support**: TypeScript, JavaScript (Python, Go, Rust planned)
- **Tree-sitter powered**: Fast, incremental, error-tolerant parsing
- **Pure logic**: No CLI or UI dependencies - just analysis functions
- **Type-safe**: Full TypeScript with Zod schemas for runtime validation
- **Lightweight**: Minimal dependencies, focused on core functionality

---

## Installation

```bash
pnpm add @specmind/core
# or
npm install @specmind/core
```

---

## Quick Start

```typescript
import { analyzeFileContent } from '@specmind/core'

const code = `
export class UserService {
  async getUser(id: string): Promise<User> {
    return await this.db.find(id)
  }
}
`

const analysis = analyzeFileContent('user-service.ts', code, 'typescript')

console.log(analysis.classes)
// [
//   {
//     name: 'UserService',
//     methods: [{ name: 'getUser', parameters: [...], ...}],
//     ...
//   }
// ]
```

---

## Architecture

### Design Principles

1. **Tree-sitter first**: All code parsing uses tree-sitter (per CONSTITUTION.md Section 2.3)
2. **Pure logic**: No side effects, file I/O, or UI concerns
3. **Type-safe**: Zod schemas + TypeScript for runtime and compile-time safety
4. **Composable**: Small, focused functions that can be combined

### Package Structure

```
@specmind/core/
├── analyzer/              # Code analysis logic
│   ├── parser.ts         # Tree-sitter parser wrapper
│   ├── language-config.ts # Language-specific configurations
│   ├── file-analyzer.ts  # Main file analysis orchestrator
│   ├── dependency-graph.ts # Dependency graph builder
│   └── extractors/       # Element extractors
│       ├── functions.ts  # Extract functions
│       ├── classes.ts    # Extract classes/interfaces
│       └── imports.ts    # Extract imports/exports
└── types/                # Type definitions and Zod schemas
    └── index.ts
```

---

## API Reference

### Core Functions

#### `analyzeFile(filePath: string): Promise<FileAnalysis | null>`

Analyze a file from the filesystem.

```typescript
import { analyzeFile } from '@specmind/core'

const analysis = await analyzeFile('./src/services/user-service.ts')

if (analysis) {
  console.log(`Found ${analysis.functions.length} functions`)
  console.log(`Found ${analysis.classes.length} classes`)
}
```

**Returns:**
- `FileAnalysis` object containing functions, classes, imports, exports
- `null` if file type is not supported

---

#### `analyzeFileContent(filePath: string, content: string, language: SupportedLanguage): FileAnalysis`

Analyze code from a string (useful for testing or in-memory analysis).

```typescript
import { analyzeFileContent } from '@specmind/core'

const code = `export function add(a: number, b: number): number { return a + b }`
const analysis = analyzeFileContent('math.ts', code, 'typescript')

console.log(analysis.functions[0])
// {
//   name: 'add',
//   parameters: [{ name: 'a', type: 'number' }, { name: 'b', type: 'number' }],
//   returnType: 'number',
//   isExported: true,
//   ...
// }
```

---

#### `buildDependencyGraph(files: FileAnalysis[]): ModuleDependency[]`

Build a module dependency graph from analyzed files.

```typescript
import { analyzeFile, buildDependencyGraph } from '@specmind/core'

const files = await Promise.all([
  analyzeFile('./src/index.ts'),
  analyzeFile('./src/utils.ts'),
]).then(results => results.filter(Boolean))

const dependencies = buildDependencyGraph(files)

console.log(dependencies)
// [
//   {
//     source: './src/index.ts',
//     target: './utils',
//     importedNames: ['helper', 'format']
//   }
// ]
```

---

#### `findEntryPoints(files: FileAnalysis[], dependencies: ModuleDependency[]): string[]`

Find entry point files (files that aren't imported by anyone).

```typescript
import { findEntryPoints } from '@specmind/core'

const entryPoints = findEntryPoints(files, dependencies)
console.log(entryPoints)
// ['./src/index.ts', './src/cli.ts']
```

---

### Language Utilities

#### `detectLanguage(filePath: string): SupportedLanguage | null`

Detect language from file extension.

```typescript
import { detectLanguage } from '@specmind/core'

console.log(detectLanguage('app.ts'))        // 'typescript'
console.log(detectLanguage('utils.js'))      // 'javascript'
console.log(detectLanguage('styles.css'))    // null
```

---

#### `getLanguageConfig(language: SupportedLanguage): LanguageConfig`

Get configuration for a specific language.

```typescript
import { getLanguageConfig } from '@specmind/core'

const config = getLanguageConfig('typescript')
console.log(config.functionNodeTypes)
// ['function_declaration', 'arrow_function', 'method_definition', ...]
```

---

### Individual Extractors (Advanced)

For fine-grained control, you can use individual extractors:

```typescript
import { parseCode, extractFunctions, extractClasses } from '@specmind/core'

const tree = parseCode(code, 'typescript')
const functions = extractFunctions(tree, 'file.ts', 'typescript')
const classes = extractClasses(tree, 'file.ts', 'typescript')
```

---

## Type Definitions

All types are exported with both TypeScript types and Zod schemas for runtime validation.

### Core Types

```typescript
import type {
  FileAnalysis,
  FunctionDefinition,
  ClassDefinition,
  ImportStatement,
  ExportStatement,
  ModuleDependency,
} from '@specmind/core'
```

### Zod Schemas

```typescript
import {
  FileAnalysisSchema,
  FunctionDefinitionSchema,
  ClassDefinitionSchema,
} from '@specmind/core'

// Runtime validation
const result = FileAnalysisSchema.safeParse(data)
if (result.success) {
  console.log(result.data)
}
```

---

## What We Extract

### Functions

```typescript
{
  name: string
  qualifiedName: string          // e.g., "MyClass.myMethod"
  parameters: Parameter[]
  returnType?: string
  isExported: boolean
  isAsync: boolean
  location: SourceLocation
  docComment?: string            // JSDoc comment if present
}
```

### Classes / Interfaces

```typescript
{
  name: string
  qualifiedName: string
  kind: 'class' | 'interface' | 'type' | 'enum'
  isExported: boolean
  isAbstract: boolean
  extendsFrom: string[]          // Base classes
  implements: string[]           // Implemented interfaces
  methods: MethodDefinition[]
  properties: PropertyDefinition[]
  location: SourceLocation
  docComment?: string
}
```

### Imports

```typescript
{
  source: string                 // Module path: './utils', 'react'
  imports: Array<{
    name: string                 // Imported name
    alias?: string               // Alias if renamed
    isDefault: boolean
    isNamespace: boolean         // import * as name
  }>
  location: SourceLocation
}
```

### Exports

```typescript
{
  name: string
  isDefault: boolean
  source?: string                // Re-export source if applicable
  location: SourceLocation
}
```

---

## Supported Languages

| Language   | Status | File Extensions | Features |
|------------|--------|-----------------|----------|
| TypeScript | ✅ Full | `.ts`, `.tsx` | Functions, classes, interfaces, types, enums, imports, exports |
| JavaScript | ✅ Full | `.js`, `.jsx` | Functions, classes, imports, exports |
| Python     | 🚧 Planned | `.py` | Coming soon |
| Go         | 🚧 Planned | `.go` | Coming soon |
| Rust       | 🚧 Planned | `.rs` | Coming soon |

---

## Implementation Details

### Tree-Sitter Approach

We use **tree-sitter queries** (pattern matching for ASTs) instead of manual traversal:

```typescript
// Example query for TypeScript functions
const functionQuery = `
  (function_declaration
    name: (identifier) @name
    parameters: (formal_parameters) @params
    return_type: (type_annotation)? @return_type) @function
`
```

This approach:
- **Fast**: Optimized pattern matching
- **Robust**: Handles syntax errors gracefully
- **Maintainable**: Declarative queries instead of imperative code
- **Consistent**: Same pattern across all languages

### What We DON'T Do

Unlike full static analysis tools, we focus on **high-level architecture**:

- ❌ No deep type inference (we use declared types)
- ❌ No control flow analysis (if/loops/branches)
- ❌ No variable tracking within functions
- ❌ No runtime behavior analysis

We extract **just enough** for generating clean architecture diagrams and documentation.

---

## Examples

### Example 1: Analyze a TypeScript Module

```typescript
import { analyzeFileContent } from '@specmind/core'

const code = `
import { Database } from './database'

export class UserRepository {
  constructor(private db: Database) {}

  async findById(id: string): Promise<User | null> {
    return await this.db.query('SELECT * FROM users WHERE id = ?', [id])
  }

  async save(user: User): Promise<void> {
    await this.db.insert('users', user)
  }
}
`

const analysis = analyzeFileContent('user-repository.ts', code, 'typescript')

console.log('Imports:', analysis.imports)
// [{ source: './database', imports: [{ name: 'Database', isDefault: false }] }]

console.log('Classes:', analysis.classes.map(c => c.name))
// ['UserRepository']

console.log('Methods:', analysis.classes[0].methods.map(m => m.name))
// ['constructor', 'findById', 'save']
```

### Example 2: Build Dependency Graph

```typescript
import { analyzeFileContent, buildDependencyGraph } from '@specmind/core'

const files = [
  analyzeFileContent('index.ts', `import { UserService } from './services'`, 'typescript'),
  analyzeFileContent('services.ts', `import { Database } from './db'`, 'typescript'),
  analyzeFileContent('db.ts', `export class Database {}`, 'typescript'),
]

const deps = buildDependencyGraph(files)

console.log(deps)
// [
//   { source: 'index.ts', target: './services', importedNames: ['UserService'] },
//   { source: 'services.ts', target: './db', importedNames: ['Database'] }
// ]
```

### Example 3: Find All Exported Functions

```typescript
const analysis = await analyzeFile('./src/utils.ts')

const exportedFunctions = analysis.functions.filter(f => f.isExported)

exportedFunctions.forEach(fn => {
  console.log(`${fn.name}(${fn.parameters.map(p => `${p.name}: ${p.type}`).join(', ')}): ${fn.returnType}`)
})
```

---

## Development

### Build

```bash
pnpm build
```

### Test

```bash
pnpm test
```

### Lint

```bash
pnpm lint
```

---

## Integration with SpecMind

This package is the foundation for:

- **`@specmind/cli`**: Uses `@specmind/core` to analyze codebases and generate .sm files
- **Future: Architecture Generator**: Convert analysis results to Mermaid diagrams
- **Future: Architecture Differ**: Compare architectures across versions

---

## Design Philosophy

Per [CONSTITUTION.md](../../CONSTITUTION.md):

1. **Tree-sitter for ALL parsing** (Section 2.3)
2. **Pure logic - NO CLI/UI dependencies** (Section 3.2)
3. **Type-safe everything** (Section 6.3)
4. **Multi-language support** (Section 6.1)

This package provides clean, typed APIs that can be used by CLI tools, VS Code extensions, or any other interface.

---

## Contributing

See the main [CONSTITUTION.md](../../CONSTITUTION.md) for development guidelines.

### Adding a New Language

1. Add language to `SupportedLanguage` type in `types/index.ts`
2. Install tree-sitter grammar: `pnpm add tree-sitter-{language}`
3. Create language config in `analyzer/language-config.ts`
4. Add parser support in `analyzer/parser.ts`
5. Test with example files

---

## License

MIT

---

## Related Packages

- **[@specmind/format](../format)**: .sm file format parser and validator
- **[@specmind/cli](../cli)**: CLI tool using this package (coming soon)
- **[specmind-vscode](../vscode)**: VS Code extension for .sm files
