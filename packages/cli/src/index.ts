#!/usr/bin/env node

import { Command } from 'commander'
import { analyzeCommand } from './commands/analyze.js'
import { setupCommand } from './commands/setup.js'

const program = new Command()

program
  .name('specmind')
  .description('AI-powered architecture documentation tool')
  .version('0.1.1')

// Analyze command
program
  .command('analyze')
  .description('Analyze codebase and generate architecture diagram')
  .option('-p, --path <path>', 'Path to analyze', process.cwd())
  .option('-f, --format <format>', 'Output format (json|pretty)', 'json')
  .action(async (options) => {
    await analyzeCommand(options)
  })

// Setup command
program
  .command('setup [assistants...]')
  .description('Set up SpecMind for your AI assistant')
  .action(async (assistants) => {
    await setupCommand({ assistants })
  })

program.parse()
