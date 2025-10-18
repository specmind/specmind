import { describe, it, expect } from 'vitest'
import * as CoreAPI from '../index.js'

describe('Core Package Exports', () => {
  it('should export all schema exports', () => {
    // Zod schema exports
    expect(CoreAPI.SourceLocationSchema).toBeDefined()
    expect(CoreAPI.ParameterSchema).toBeDefined()
    expect(CoreAPI.FunctionDefinitionSchema).toBeDefined()
    expect(CoreAPI.MethodDefinitionSchema).toBeDefined()
    expect(CoreAPI.PropertyDefinitionSchema).toBeDefined()
    expect(CoreAPI.ClassDefinitionSchema).toBeDefined()
    expect(CoreAPI.ImportStatementSchema).toBeDefined()
    expect(CoreAPI.ExportStatementSchema).toBeDefined()
    expect(CoreAPI.FileAnalysisSchema).toBeDefined()
    expect(CoreAPI.ModuleDependencySchema).toBeDefined()
    expect(CoreAPI.CodebaseAnalysisSchema).toBeDefined()
    expect(CoreAPI.AnalysisOptionsSchema).toBeDefined()
  })

  it('should export analyzer functions', () => {
    expect(typeof CoreAPI.analyzeFile).toBe('function')
    expect(typeof CoreAPI.analyzeFileContent).toBe('function')
    expect(typeof CoreAPI.buildDependencyGraph).toBe('function')
    expect(typeof CoreAPI.findEntryPoints).toBe('function')
  })

  it('should export parser functions', () => {
    expect(typeof CoreAPI.getParser).toBe('function')
    expect(typeof CoreAPI.parseCode).toBe('function')
    expect(typeof CoreAPI.parseFile).toBe('function')
  })

  it('should export language config functions and constants', () => {
    expect(typeof CoreAPI.detectLanguage).toBe('function')
    expect(typeof CoreAPI.getLanguageConfig).toBe('function')
    expect(CoreAPI.TYPESCRIPT_CONFIG).toBeDefined()
    expect(CoreAPI.JAVASCRIPT_CONFIG).toBeDefined()
  })

  it('should export extractor functions', () => {
    expect(typeof CoreAPI.extractFunctions).toBe('function')
    expect(typeof CoreAPI.extractClasses).toBe('function')
    expect(typeof CoreAPI.extractImports).toBe('function')
    expect(typeof CoreAPI.extractExports).toBe('function')
  })
})
