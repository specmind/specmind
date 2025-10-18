# Change Log

All notable changes to the SpecMind VS Code extension will be documented in this file.

## [0.1.1] - 2025-10-18

### Added
- Extension icon with terminal-style "##" logo on black background

### Changed
- Updated extension branding with new visual identity

## [0.1.0] - 2025-01-17

### Added
- Initial release of SpecMind VS Code extension
- **Syntax highlighting** for .sm files with full markdown and Mermaid support
- **Live preview panel** with rendered Mermaid diagrams
- **Full markdown rendering** - displays all sections including custom ones
- **Auto-refresh** preview when .sm files are saved
- **Keyboard shortcut** (`Ctrl+Shift+V` / `Cmd+Shift+V`) to open preview
- **Context menu integration** - Right-click .sm files to preview
- **Editor toolbar buttons** - Quick access to preview commands
- **Special styling** for Notes section (green border callout)
- **Support for multiple Mermaid diagrams** in a single file
- Integration with `@specmind/format` parser for validation

### Features
- Renders all 7 standard sections: Overview, Requirements, Architecture, Design Decisions, Integration Points, Notes
- Supports custom H2 sections - any `## Custom Section` will be displayed
- VS Code theme-aware (dark/light mode support)
- Inline markdown formatting (bold, italic, code, links)
- Proper list rendering with bullet points

### Technical
- Built with TypeScript
- Uses Mermaid.js 10.6.1 for diagram rendering
- WebView panel for rich preview experience
