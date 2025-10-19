# SpecMind for Claude Code

This directory contains slash command implementations for Claude Code.

## Installation

```bash
# From your project root
npx specmind setup claude-code
```

This will copy the `.claude/commands/` directory to your project root.

## Available Commands

- `/init` - Initialize SpecMind and analyze your codebase
- `/design <feature-name>` - Design a new feature with architecture spec
- `/implement <feature-name>` - Implement a feature based on its spec

## How It Works

Each command file (`.claude/commands/*.md`) is a thin wrapper that:
1. Loads the shared prompt template from `.claude/prompts/`
2. Provides Claude Code-specific context
3. Executes the command logic

The shared prompts ensure consistency across all AI assistants while allowing for assistant-specific customization.
