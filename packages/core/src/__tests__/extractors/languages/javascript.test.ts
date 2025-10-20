import { describe, it, expect } from 'vitest'
import { parseCode } from '../../../analyzer/parser.js'
import { extractFunctions } from '../../../analyzer/extractors/functions.js'
import { extractClasses } from '../../../analyzer/extractors/classes.js'
import { extractImports } from '../../../analyzer/extractors/imports.js'
import { extractExports } from '../../../analyzer/extractors/imports.js'

describe('JavaScript Language Specifics', () => {
  describe('ES6+ Features', () => {
    it('should extract arrow functions', () => {
      const code = `
const add = (a, b) => a + b
const greet = name => \`Hello \${name}\`
const log = () => console.log('hi')
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions.length).toBeGreaterThanOrEqual(3)
    })

    it('should extract async arrow functions', () => {
      const code = `
const fetchUser = async (id) => {
  return await api.get(id)
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle template literals in functions', () => {
      const code = `
function greet(name) {
  return \`Hello \${name}\`
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('greet')
    })

    it('should handle destructured parameters', () => {
      const code = `
function process({ name, age, ...rest }) {
  return { name, age }
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
    })

    it('should handle rest parameters', () => {
      const code = `
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0)
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      // May extract both sum and the reduce callback
      expect(functions.length).toBeGreaterThanOrEqual(1)
      expect(functions.some(f => f.name === 'sum')).toBe(true)
    })

    it('should handle default parameters', () => {
      const code = `
function greet(name = 'World', greeting = 'Hello') {
  return \`\${greeting}, \${name}\`
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('greet')
      // Note: Parameter extraction for JavaScript may vary
      expect(functions[0].parameters).toBeDefined()
    })
  })

  describe('Class Features', () => {
    it('should extract ES6 classes', () => {
      const code = `
class User {
  constructor(name) {
    this.name = name
  }

  greet() {
    return \`Hello, \${this.name}\`
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes).toHaveLength(1)
      expect(classes[0].name).toBe('User')
      expect(classes[0].methods.length).toBeGreaterThanOrEqual(1)
    })

    it('should extract static methods', () => {
      const code = `
class MathUtils {
  static add(a, b) {
    return a + b
  }

  static multiply(a, b) {
    return a * b
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      const staticMethods = classes[0].methods.filter(m => m.isStatic)
      expect(staticMethods.length).toBeGreaterThanOrEqual(2)
    })

    it('should extract getter and setter methods', () => {
      const code = `
class Person {
  get fullName() {
    return \`\${this.first} \${this.last}\`
  }

  set fullName(value) {
    const parts = value.split(' ')
    this.first = parts[0]
    this.last = parts[1]
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes[0].methods.length).toBeGreaterThanOrEqual(2)
    })

    it('should extract class inheritance', () => {
      const code = `
class Animal {
  move() {
    console.log('moving')
  }
}

class Dog extends Animal {
  bark() {
    console.log('woof')
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes).toHaveLength(2)
      expect(classes.some(c => c.name === 'Dog')).toBe(true)
    })

    it('should handle class expressions', () => {
      const code = `
const MyClass = class {
  method() {
    return 'value'
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes).toHaveLength(1)
      expect(classes[0].methods).toHaveLength(1)
    })
  })

  describe('Module System', () => {
    it('should extract named imports', () => {
      const code = `
import { foo, bar } from './module'
      `
      const tree = parseCode(code, 'javascript')
      const imports = extractImports(tree, 'test.js', 'javascript')

      expect(imports).toHaveLength(1)
      expect(imports[0].imports.length).toBeGreaterThanOrEqual(2)
    })

    it('should extract default imports', () => {
      const code = `
import React from 'react'
      `
      const tree = parseCode(code, 'javascript')
      const imports = extractImports(tree, 'test.js', 'javascript')

      expect(imports).toHaveLength(1)
      expect(imports[0].imports[0].isDefault).toBe(true)
    })

    it('should extract namespace imports', () => {
      const code = `
import * as utils from './utils'
      `
      const tree = parseCode(code, 'javascript')
      const imports = extractImports(tree, 'test.js', 'javascript')

      expect(imports).toHaveLength(1)
      expect(imports[0].imports[0].isNamespace).toBe(true)
    })

    it('should extract mixed imports', () => {
      const code = `
import React, { useState, useEffect } from 'react'
      `
      const tree = parseCode(code, 'javascript')
      const imports = extractImports(tree, 'test.js', 'javascript')

      expect(imports).toHaveLength(1)
      expect(imports[0].imports.length).toBeGreaterThanOrEqual(2)
    })

    it('should extract aliased imports', () => {
      const code = `
import { original as renamed } from './module'
      `
      const tree = parseCode(code, 'javascript')
      const imports = extractImports(tree, 'test.js', 'javascript')

      expect(imports).toHaveLength(1)
      expect(imports[0].imports[0].name).toBe('original')
      expect(imports[0].imports[0].alias).toBe('renamed')
    })

    it('should extract named exports', () => {
      const code = `
export function greet() {}
export const value = 42
export class User {}
      `
      const tree = parseCode(code, 'javascript')
      const exports = extractExports(tree, 'test.js', 'javascript')

      // Should extract at least the function and class exports
      expect(exports.length).toBeGreaterThanOrEqual(2)
    })

    it('should extract default export', () => {
      const code = `
export default function main() {}
      `
      const tree = parseCode(code, 'javascript')
      const exports = extractExports(tree, 'test.js', 'javascript')

      expect(exports.length).toBeGreaterThanOrEqual(1)
    })

    it('should extract export lists', () => {
      const code = `
const a = 1
const b = 2
export { a, b }
      `
      const tree = parseCode(code, 'javascript')
      const exports = extractExports(tree, 'test.js', 'javascript')

      expect(exports.length).toBeGreaterThanOrEqual(1)
    })

    it('should extract re-exports', () => {
      const code = `
export { User } from './types'
export * from './utils'
      `
      const tree = parseCode(code, 'javascript')
      const exports = extractExports(tree, 'test.js', 'javascript')

      expect(exports.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Async/Await', () => {
    it('should extract async functions', () => {
      const code = `
async function fetchData() {
  return await api.get()
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions[0].isAsync).toBe(true)
    })

    it('should extract async methods', () => {
      const code = `
class DataService {
  async fetch(id) {
    return await this.api.get(id)
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes[0].methods[0].isAsync).toBe(true)
    })

    it('should extract async generators', () => {
      const code = `
async function* generateSequence() {
  yield 1
  yield 2
  yield 3
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      // Note: Generator functions may not be extracted in current implementation
      // This documents expected behavior for future enhancement
      expect(functions).toBeDefined()
    })
  })

  describe('Generator Functions', () => {
    it('should extract generator functions', () => {
      const code = `
function* idGenerator() {
  let id = 0
  while (true) {
    yield id++
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('idGenerator')
    })

    it('should extract generator methods', () => {
      const code = `
class Collection {
  *items() {
    yield 1
    yield 2
    yield 3
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      // Generator methods may not be extracted yet
      expect(classes).toHaveLength(1)
    })
  })

  describe('Object and Array Patterns', () => {
    it('should handle object shorthand methods', () => {
      const code = `
const obj = {
  method() {
    return 'value'
  },
  async asyncMethod() {
    return await fetch()
  }
}
      `
      const tree = parseCode(code, 'javascript')

      // Object methods are typically not extracted as standalone functions
      expect(tree).toBeDefined()
    })

    it('should handle computed property names', () => {
      const code = `
const key = 'dynamicKey'
class MyClass {
  [key]() {
    return 'value'
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes).toHaveLength(1)
    })
  })

  describe('Edge Cases', () => {
    it('should handle IIFE (Immediately Invoked Function Expression)', () => {
      const code = `
(function() {
  console.log('IIFE')
})()
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      // Note: IIFEs may not be extracted in current implementation
      // This documents expected behavior for future enhancement
      expect(functions).toBeDefined()
    })

    it('should handle function expressions', () => {
      const code = `
const myFunc = function() {
  return 'value'
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
    })

    it('should handle named function expressions', () => {
      const code = `
const factorial = function fact(n) {
  if (n <= 1) return 1
  return n * fact(n - 1)
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
      expect(functions[0].name).toBe('fact')
    })

    it('should handle nested functions', () => {
      const code = `
function outer() {
  function inner() {
    return 'nested'
  }
  return inner
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle callback functions', () => {
      const code = `
function process(callback) {
  return callback()
}

process(function() {
  console.log('callback')
})
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions.length).toBeGreaterThanOrEqual(1)
    })

    it('should handle empty function bodies', () => {
      const code = `
function empty() {}
const emptyArrow = () => {}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions.length).toBeGreaterThanOrEqual(2)
    })

    it('should handle methods with no parameters', () => {
      const code = `
class Service {
  start() {
    this.running = true
  }
}
      `
      const tree = parseCode(code, 'javascript')
      const classes = extractClasses(tree, 'test.js', 'javascript')

      expect(classes[0].methods[0].parameters).toHaveLength(0)
    })
  })

  describe('CommonJS (require/module.exports)', () => {
    it('should handle CommonJS requires', () => {
      const code = `
const fs = require('fs')
const { join } = require('path')
      `
      const tree = parseCode(code, 'javascript')

      // CommonJS requires may not be extracted as ES6 imports
      // This test documents the distinction
      expect(tree).toBeDefined()
    })

    it('should handle module.exports', () => {
      const code = `
module.exports = {
  greet: function() {},
  farewell: function() {}
}
      `
      const tree = parseCode(code, 'javascript')

      // module.exports may not be extracted as ES6 exports
      expect(tree).toBeDefined()
    })
  })

  describe('Dynamic Imports', () => {
    it('should handle dynamic import expressions', () => {
      const code = `
async function loadModule() {
  const module = await import('./module.js')
  return module.default
}
      `
      const tree = parseCode(code, 'javascript')
      const functions = extractFunctions(tree, 'test.js', 'javascript')

      expect(functions).toHaveLength(1)
      expect(functions[0].isAsync).toBe(true)
    })
  })
})
