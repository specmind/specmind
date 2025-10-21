# SpecMind VS Code Extension

Visual editor and preview for SpecMind .sm files.

## Features

### 🎨 Syntax Highlighting
- **Full .sm file support** with proper syntax highlighting
- **Markdown sections** - Headers, lists, emphasis, links
- **Mermaid code blocks** - Keywords, operators, entities
- **Emoji support** - Visual indicators (⚠️, 💡, 🔧, etc.)

### 📊 Visual Preview
- **Live preview panel** with rendered .sm content
- **Mermaid diagram rendering** - Interactive architecture diagrams
- **Formatted sections** - Overview, requirements, design decisions
- **Auto-refresh** when .sm files are saved

### ⌨️ Commands & Shortcuts
- **Open Preview** (`Ctrl+Shift+V` / `Cmd+Shift+V`)
- **Open Preview to Side** - View source and preview simultaneously
- **Context menu integration** - Right-click .sm files to preview

## Usage

### Opening .sm Files
1. **Open any .sm file** in VS Code
2. **Automatic syntax highlighting** will be applied
3. **Click the preview icon** in the editor toolbar, or
4. **Press `Ctrl+Shift+V`** to open preview panel

### Preview Features
- **Live updates** - Preview refreshes when you save the file
- **Mermaid rendering** - Architecture diagrams are rendered visually
- **Responsive layout** - Adapts to VS Code themes (dark/light)
- **Section navigation** - Clear organization of .sm file sections

## Installation

### From VS Code Marketplace
```
ext install SpecMind.specmind-vscode
```

Or install from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=SpecMind.specmind-vscode).

### From Open VSX Registry (Windsurf, VSCodium, etc.)
```
ext install SpecMind.specmind-vscode
```

Or install from [Open VSX](https://open-vsx.org/extension/SpecMind/specmind-vscode).

**Windsurf users**: Search for "SpecMind" in the Extensions panel.

### Development Installation
1. Clone the SpecMind repository
2. Navigate to `packages/vscode/`
3. Run `pnpm install && pnpm build`
4. Press `F5` to launch Extension Development Host

## Supported File Types

- **`.sm` files** - SpecMind architecture specification files

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `SpecMind: Open Preview` | `Ctrl+Shift+V` | Open preview panel |
| `SpecMind: Open Preview to the Side` | - | Open preview beside editor |

## Architecture

This extension integrates with the SpecMind ecosystem:

- **@specmind/format** - Parses .sm files and validates content
- **Mermaid.js** - Renders architecture diagrams
- **VS Code API** - Provides editor integration and webview panels

### Dependencies
- `@specmind/format` - .sm file parsing and validation
- `mermaid` - Diagram rendering
- `@types/vscode` - VS Code extension API

## Development

### Project Structure
```
packages/vscode/
├── src/
│   ├── extension.ts          # Main extension entry point
│   └── previewPanel.ts       # Webview panel for .sm preview
├── syntaxes/
│   └── specmind.tmGrammar.json  # Syntax highlighting rules
├── language-configuration.json  # Language configuration
└── package.json              # Extension manifest
```

### Building
```bash
# Build extension
pnpm build

# Watch for changes
pnpm watch

# Package for distribution
pnpm package
```

### Testing
1. **Open VS Code in the `packages/vscode/` directory**
2. **Press `F5`** to launch Extension Development Host
3. **Open a .sm file** (try the test fixtures from `@specmind/format`)
4. **Test syntax highlighting and preview functionality**

## Examples

The extension works great with the SpecMind test fixtures:
- `packages/format/test-fixtures/.specmind/system.sm`
- `packages/format/test-fixtures/.specmind/features/user-authentication.sm`

These demonstrate:
- Complex Mermaid diagrams with subgraphs
- Multiple sections (overview, requirements, etc.)
- Real-world architecture specifications

## Contributing

This extension is part of the SpecMind monorepo. See the main [CONSTITUTION.md](../../CONSTITUTION.md) for development guidelines.

### Extension Guidelines
- Follow VS Code extension best practices
- Keep preview rendering fast and responsive
- Support VS Code themes (dark/light)
- Maintain compatibility with @specmind/format package