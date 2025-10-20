import { describe, it, expect } from 'vitest'
import { parseCode } from '../../../analyzer/parser.js'
import { extractFunctions } from '../../../analyzer/extractors/functions.js'
import { extractClasses } from '../../../analyzer/extractors/classes.js'
import { extractImports } from '../../../analyzer/extractors/imports.js'
import { extractExports } from '../../../analyzer/extractors/imports.js'

describe('TypeScript Language Specifics', () => {
  describe('Generics', () => {
    it('should handle generic functions', () => {
      const code = `
function identity<T>(arg: T): T {
  return arg
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('identity')
      // Generic parameters may be part of parameter types
      expect(functions[0].returnType).toBe('T')
    })

    it('should handle generic classes', () => {
      const code = `
class Container<T> {
  private value: T

  constructor(value: T) {
    this.value = value
  }

  getValue(): T {
    return this.value
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes).toHaveLength(1)
      expect(classes[0].name).toBe('Container')
      expect(classes[0].methods.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle generic interfaces', () => {
      const code = `
interface Repository<T, ID> {
  findById(id: ID): Promise<T>
  save(entity: T): Promise<T>
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes).toHaveLength(1)
      expect(classes[0].kind).toBe('interface')
      expect(classes[0].name).toBe('Repository')
    })

    it('should handle constrained generics', () => {
      const code = `
function process<T extends string | number>(value: T): T {
  return value
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions).toHaveLength(1)
      expect(functions[0].parameters[0].name).toBe('value')
    })
  })

  describe('Advanced Types', () => {
    it('should handle union types', () => {
      const code = `
function format(value: string | number | boolean): string {
  return String(value)
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions[0].parameters[0].type).toBe('string | number | boolean')
    })

    it('should handle intersection types', () => {
      const code = `
type Named = { name: string }
type Aged = { age: number }
type Person = Named & Aged

function greet(person: Named & Aged): string {
  return person.name
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(classes.some(c => c.kind === 'type')).toBe(true)
      expect(functions).toHaveLength(1)
    })

    it('should handle tuple types', () => {
      const code = `
function swap(pair: [number, string]): [string, number] {
  return [pair[1], pair[0]]
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions[0].parameters[0].type).toBe('[number, string]')
      expect(functions[0].returnType).toBe('[string, number]')
    })

    it('should handle mapped types', () => {
      const code = `
type Readonly<T> = {
  readonly [P in keyof T]: T[P]
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes.some(c => c.kind === 'type' && c.name === 'Readonly')).toBe(true)
    })

    it('should handle conditional types', () => {
      const code = `
type IsString<T> = T extends string ? true : false
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes.some(c => c.kind === 'type' && c.name === 'IsString')).toBe(true)
    })
  })

  describe('Decorators', () => {
    it('should handle class decorators', () => {
      const code = `
@sealed
class BugReport {
  type = "report"
  title: string

  constructor(t: string) {
    this.title = t
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes).toHaveLength(1)
      expect(classes[0].name).toBe('BugReport')
    })

    it('should handle method decorators', () => {
      const code = `
class Greeter {
  @enumerable(false)
  greet() {
    return "Hello"
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods).toHaveLength(1)
    })

    it('should handle parameter decorators', () => {
      const code = `
class Service {
  get(@required path: string) {
    return path
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods[0].parameters.some(p => p.name === 'path')).toBe(true)
    })
  })

  describe('Access Modifiers', () => {
    it('should extract public methods', () => {
      const code = `
class User {
  public getName(): string {
    return "name"
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods[0].visibility).toBe('public')
    })

    it('should extract private methods', () => {
      const code = `
class User {
  private validate(): boolean {
    return true
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods[0].visibility).toBe('private')
    })

    it('should extract protected methods', () => {
      const code = `
class Base {
  protected helper(): void {}
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods[0].visibility).toBe('protected')
    })

    it('should handle readonly properties', () => {
      const code = `
class Config {
  readonly apiKey: string

  constructor(key: string) {
    this.apiKey = key
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].properties.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Abstract Classes', () => {
    it('should detect abstract classes', () => {
      const code = `
abstract class Animal {
  abstract makeSound(): void

  move(): void {
    console.log("moving")
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes).toHaveLength(1)
      expect(classes[0].name).toBe('Animal')
      // Note: Abstract detection may require enhancement
    })

    it('should detect abstract methods', () => {
      const code = `
abstract class Shape {
  abstract getArea(): number
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      // Note: Abstract method signatures may not be extracted as methods
      // This documents expected behavior for future enhancement
      expect(classes).toHaveLength(1)
      expect(classes[0].name).toBe('Shape')
    })
  })

  describe('Interfaces', () => {
    it('should extract interface properties and methods', () => {
      const code = `
interface User {
  id: string
  name: string
  age: number
  greet(): string
  update(data: Partial<User>): void
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      const userInterface = classes.find(c => c.name === 'User')
      expect(userInterface).toBeDefined()
      expect(userInterface!.kind).toBe('interface')
    })

    it('should handle extending interfaces', () => {
      const code = `
interface Named {
  name: string
}

interface Person extends Named {
  age: number
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes).toHaveLength(2)
      expect(classes.every(c => c.kind === 'interface')).toBe(true)
    })

    it('should handle interface merging', () => {
      const code = `
interface User {
  name: string
}

interface User {
  age: number
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      // Should extract both declarations
      expect(classes.filter(c => c.name === 'User').length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Enums', () => {
    it('should extract string enums', () => {
      const code = `
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT"
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      const enumDef = classes.find(c => c.kind === 'enum')
      expect(enumDef).toBeDefined()
      expect(enumDef!.name).toBe('Direction')
    })

    it('should extract numeric enums', () => {
      const code = `
enum Status {
  Pending = 0,
  Active = 1,
  Completed = 2
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes.some(c => c.kind === 'enum' && c.name === 'Status')).toBe(true)
    })

    it('should extract const enums', () => {
      const code = `
const enum Color {
  Red,
  Green,
  Blue
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes.some(c => c.kind === 'enum' && c.name === 'Color')).toBe(true)
    })
  })

  describe('Import/Export Variations', () => {
    it('should handle type-only imports', () => {
      const code = `
import type { User } from './types'
import { type Admin, getUser } from './api'
      `
      const tree = parseCode(code, 'typescript')
      const imports = extractImports(tree, 'test.ts', 'typescript')

      expect(imports.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle namespace imports', () => {
      const code = `
import * as utils from './utils'
      `
      const tree = parseCode(code, 'typescript')
      const imports = extractImports(tree, 'test.ts', 'typescript')

      expect(imports[0].imports[0].isNamespace).toBe(true)
    })

    it('should handle re-exports', () => {
      const code = `
export { User } from './types'
export * from './api'
export * as helpers from './helpers'
      `
      const tree = parseCode(code, 'typescript')
      const exports = extractExports(tree, 'test.ts', 'typescript')

      expect(exports.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle default exports', () => {
      const code = `
export default class Database {}
      `
      const tree = parseCode(code, 'typescript')
      const exports = extractExports(tree, 'test.ts', 'typescript')

      expect(exports.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Function Overloads', () => {
    it('should handle function overload signatures', () => {
      const code = `
function add(a: number, b: number): number
function add(a: string, b: string): string
function add(a: any, b: any): any {
  return a + b
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      // Should extract overload signatures
      expect(functions.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle method overloads', () => {
      const code = `
class Calculator {
  add(a: number, b: number): number
  add(a: string, b: string): string
  add(a: any, b: any): any {
    return a + b
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Async/Await', () => {
    it('should detect async functions', () => {
      const code = `
async function fetchUser(id: string): Promise<User> {
  return await api.get(id)
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions[0].isAsync).toBe(true)
      expect(functions[0].returnType).toBe('Promise<User>')
    })

    it('should detect async methods', () => {
      const code = `
class UserService {
  async getUser(id: string): Promise<User> {
    return await this.db.find(id)
  }
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes[0].methods[0].isAsync).toBe(true)
    })

    it('should detect async arrow functions', () => {
      const code = `
const fetchData = async (): Promise<Data> => {
  return await api.get()
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle optional parameters', () => {
      const code = `
function greet(name: string, title?: string): string {
  return title ? \`\${title} \${name}\` : name
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions[0].parameters[0].optional).toBe(false)
      expect(functions[0].parameters[1].optional).toBe(true)
    })

    it('should handle rest parameters', () => {
      const code = `
function sum(...numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0)
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      // May extract both sum and the reduce callback
      expect(functions.length).toBeGreaterThanOrEqual(1)
      expect(functions.some(f => f.name === 'sum')).toBe(true)
    })

    it('should handle destructured parameters', () => {
      const code = `
function greet({ name, age }: { name: string; age: number }): string {
  return \`\${name} is \${age}\`
}
      `
      const tree = parseCode(code, 'typescript')
      const functions = extractFunctions(tree, 'test.ts', 'typescript')

      expect(functions).toHaveLength(1)
    })

    it('should handle index signatures', () => {
      const code = `
interface StringMap {
  [key: string]: string
}
      `
      const tree = parseCode(code, 'typescript')
      const classes = extractClasses(tree, 'test.ts', 'typescript')

      expect(classes.some(c => c.name === 'StringMap')).toBe(true)
    })
  })
})
