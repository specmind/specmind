import Parser from 'tree-sitter'
import Python from 'tree-sitter-python'
import type {
  Entity,
  EntityDetector,
  EntityField,
  Relationship,
} from '../../../types/entity.js'
import { detectFrameworkFromSource, getOrmFieldPatterns, detectFieldType, matchesPropertyPattern, shouldSkipField, detectRelationshipType, getOrmDisplayName, getOrmDetectionPatterns } from '../framework-detector.js'

export class PythonEntityDetector implements EntityDetector {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(Python)
  }

  shouldScanFile(filePath: string): boolean {
    // Check file extension
    if (!/\.py$/.test(filePath)) {
      return false
    }

    // Skip test files
    if (/(test_|_test\.py|tests\.py)/.test(filePath)) {
      return false
    }

    // Check directory patterns
    const entityDirs = ['models', 'entities', 'data', 'domain', 'schemas', 'database']
    const hasEntityDir = entityDirs.some((dir) => filePath.includes(`/${dir}/`))

    // Check file naming patterns
    const entityPatterns = ['_model.py', '_entity.py', '_schema.py']
    const hasEntityPattern = entityPatterns.some((pattern) => filePath.endsWith(pattern))

    return hasEntityDir || hasEntityPattern
  }

  getSupportedExtensions(): string[] {
    return ['.py']
  }

  detectEntities(sourceCode: string, filePath: string, service: string): Entity[] {
    const tree = this.parser.parse(sourceCode)
    const entities: Entity[] = []

    // Find all class definitions
    const classNodes = this.findClassDefinitions(tree.rootNode, sourceCode)

    for (const classNode of classNodes) {
      const entity = this.detectEntityFromClass(classNode, sourceCode, filePath, service)
      if (entity) {
        entities.push(entity)
      }
    }

    return entities
  }

  private findClassDefinitions(node: Parser.SyntaxNode, _sourceCode: string): Parser.SyntaxNode[] {
    const classes: Parser.SyntaxNode[] = []

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'class_definition') {
        classes.push(n)
      }
      n.children.forEach(traverse)
    }

    traverse(node)
    return classes
  }

  private detectEntityFromClass(
    classNode: Parser.SyntaxNode,
    sourceCode: string,
    filePath: string,
    service: string
  ): Entity | null {
    // Get class name
    const nameNode = classNode.childForFieldName('name')
    if (!nameNode) return null

    const className = sourceCode.substring(nameNode.startIndex, nameNode.endIndex)

    // Detection signals
    const signals: string[] = []
    let confidence = 0
    let framework: string | undefined

    // Detect framework from imports first
    const detectedFramework = detectFrameworkFromSource(sourceCode, 'python')
    if (detectedFramework) {
      framework = detectedFramework
    }

    // Get ORM detection patterns from config
    const ormPatterns = getOrmDetectionPatterns('python')

    // Check base classes
    const baseClasses = this.getBaseClasses(classNode, sourceCode)

    // Check each ORM pattern from config
    for (const [ormPackage, patternData] of Object.entries(ormPatterns)) {
      const pattern = patternData as any

      // Check base class patterns
      if (pattern.baseClassPatterns && pattern.baseClassPatterns.length > 0) {
        const matchesBaseClass = baseClasses.some((base: string) =>
          pattern.baseClassPatterns.some((p: string) => base === p || base.endsWith('.' + p))
        )

        if (matchesBaseClass) {
          // Check additional requirements (e.g., Pydantic needs orm_mode)
          if (pattern.requiresOrmMode && !this.hasOrmMode(classNode, sourceCode)) {
            continue // Skip this pattern
          }

          const displayName = getOrmDisplayName(ormPackage)
          signals.push(`${pattern.signal} (${displayName})`)
          confidence += pattern.confidenceScore
        }
      }

      // Check attribute patterns (e.g., __tablename__)
      if (pattern.attributePatterns && pattern.attributePatterns.length > 0) {
        const hasAttribute = pattern.attributePatterns.some((attr: string) => {
          if (attr === '__tablename__') {
            return this.hasTableName(classNode, sourceCode)
          }
          return false
        })

        if (hasAttribute) {
          signals.push('has __tablename__ attribute')
          confidence += 0.3
        }
      }
    }

    // Check file location
    if (this.shouldScanFile(filePath)) {
      signals.push('in entity directory or named as entity file')
      confidence += 0.2
    }

    // Need at least confidence of 0.4 to consider it an entity
    if (confidence < 0.4) {
      return null
    }

    // Extract fields
    const fields = this.extractFields(classNode, sourceCode, framework)

    // Extract relationships
    const relationships = this.extractRelationships(classNode, sourceCode, framework)

    // Extract table name
    const tableName = this.extractTableName(classNode, sourceCode, className)

    const entity: Entity = {
      name: className,
      filePath,
      service,
      fields,
      relationships,
      confidence,
      detectionSignals: signals,
    }

    if (tableName) entity.tableName = tableName
    if (framework) entity.framework = framework

    return entity
  }

  private getBaseClasses(classNode: Parser.SyntaxNode, sourceCode: string): string[] {
    const argumentList = classNode.childForFieldName('superclasses')
    if (!argumentList) return []

    const bases: string[] = []

    for (const child of argumentList.children) {
      if (child.type === 'identifier' || child.type === 'attribute') {
        const baseName = sourceCode.substring(child.startIndex, child.endIndex)
        bases.push(baseName)
      }
    }

    return bases
  }

  private hasTableName(classNode: Parser.SyntaxNode, sourceCode: string): boolean {
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return false

    for (const stmt of bodyNode.children) {
      if (stmt.type === 'expression_statement') {
        const assignment = stmt.child(0)
        if (assignment && assignment.type === 'assignment') {
          const leftNode = assignment.childForFieldName('left')
          if (leftNode) {
            const varName = sourceCode.substring(leftNode.startIndex, leftNode.endIndex)
            if (varName === '__tablename__') {
              return true
            }
          }
        }
      }
    }

    return false
  }

  private hasOrmMode(classNode: Parser.SyntaxNode, sourceCode: string): boolean {
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return false

    // Look for nested Config class with orm_mode = True
    for (const stmt of bodyNode.children) {
      if (stmt.type === 'class_definition') {
        const nestedNameNode = stmt.childForFieldName('name')
        if (nestedNameNode) {
          const nestedName = sourceCode.substring(nestedNameNode.startIndex, nestedNameNode.endIndex)
          if (nestedName === 'Config') {
            const configBody = stmt.childForFieldName('body')
            if (configBody) {
              const configText = sourceCode.substring(configBody.startIndex, configBody.endIndex)
              if (configText.includes('orm_mode') && configText.includes('True')) {
                return true
              }
            }
          }
        }
      }
    }

    return false
  }

  private extractFields(classNode: Parser.SyntaxNode, sourceCode: string, framework?: string): EntityField[] {
    const fields: EntityField[] = []
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return fields

    for (const stmt of bodyNode.children) {
      // Class-level assignments
      if (stmt.type === 'expression_statement') {
        const assignment = stmt.child(0)
        if (assignment && assignment.type === 'assignment') {
          const field = this.extractField(assignment, sourceCode, framework)
          if (field) {
            fields.push(field)
          }
        }
      }
    }

    return fields
  }

  private extractField(assignmentNode: Parser.SyntaxNode, sourceCode: string, framework?: string): EntityField | null {
    const leftNode = assignmentNode.childForFieldName('left')
    const rightNode = assignmentNode.childForFieldName('right')

    if (!leftNode || !rightNode) return null

    const fieldName = sourceCode.substring(leftNode.startIndex, leftNode.endIndex)

    // Skip __tablename__ and other special attributes
    if (fieldName.startsWith('__')) return null

    const rightText = sourceCode.substring(rightNode.startIndex, rightNode.endIndex)

    // Get ORM patterns from config
    const ormPatterns = getOrmFieldPatterns(framework)

    // If no patterns or should skip (e.g., relationships), return null
    if (!ormPatterns || shouldSkipField(rightText, ormPatterns)) {
      return null
    }

    // Use config-driven detection
    const type = detectFieldType(rightText, ormPatterns)
    const originalType = rightText
    const isPrimaryKey = matchesPropertyPattern(rightText, ormPatterns, 'primaryKey')
    const isUnique = matchesPropertyPattern(rightText, ormPatterns, 'unique')
    const isForeignKey = matchesPropertyPattern(rightText, ormPatterns, 'foreignKey')
    const isNullable = matchesPropertyPattern(rightText, ormPatterns, 'nullable')

    return {
      name: fieldName,
      type,
      originalType,
      isPrimaryKey,
      isUnique,
      isForeignKey,
      isNullable,
    }
  }

  private extractRelationships(classNode: Parser.SyntaxNode, sourceCode: string, framework?: string): Relationship[] {
    const relationships: Relationship[] = []
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return relationships

    for (const stmt of bodyNode.children) {
      if (stmt.type === 'expression_statement') {
        const assignment = stmt.child(0)
        if (assignment && assignment.type === 'assignment') {
          const relationship = this.extractRelationship(assignment, sourceCode, framework)
          if (relationship) {
            relationships.push(relationship)
          }
        }
      }
    }

    return relationships
  }

  private extractRelationship(assignmentNode: Parser.SyntaxNode, sourceCode: string, framework?: string): Relationship | null {
    const rightNode = assignmentNode.childForFieldName('right')
    if (!rightNode) return null

    const rightText = sourceCode.substring(rightNode.startIndex, rightNode.endIndex)

    // Get ORM patterns from config
    const ormPatterns = getOrmFieldPatterns(framework)
    if (!ormPatterns) return null

    // Detect relationship type from patterns
    const relInfo = detectRelationshipType(rightText, ormPatterns)
    if (!relInfo) return null

    // Extract target entity name from the field text
    // Try multiple patterns for different ORM syntaxes
    const patterns = [
      /ForeignKey\s*\(\s*([A-Z][a-zA-Z0-9_]*)/,           // Django: ForeignKey(User)
      /ManyToManyField\s*\(\s*([A-Z][a-zA-Z0-9_]*)/,     // Django: ManyToManyField(User)
      /OneToOneField\s*\(\s*([A-Z][a-zA-Z0-9_]*)/,       // Django: OneToOneField(User)
      /relationship\s*\(\s*["']([A-Z][a-zA-Z0-9_]*)["']/ // SQLAlchemy: relationship("User")
    ]

    for (const pattern of patterns) {
      const match = rightText.match(pattern)
      if (match && match[1]) {
        return {
          type: relInfo.type as any,
          targetEntity: match[1],
        }
      }
    }

    return null
  }

  private extractTableName(classNode: Parser.SyntaxNode, sourceCode: string, className: string): string | undefined {
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return undefined

    // Look for __tablename__ assignment
    for (const stmt of bodyNode.children) {
      if (stmt.type === 'expression_statement') {
        const assignment = stmt.child(0)
        if (assignment && assignment.type === 'assignment') {
          const leftNode = assignment.childForFieldName('left')
          const rightNode = assignment.childForFieldName('right')

          if (leftNode && rightNode) {
            const varName = sourceCode.substring(leftNode.startIndex, leftNode.endIndex)
            if (varName === '__tablename__') {
              const valueText = sourceCode.substring(rightNode.startIndex, rightNode.endIndex)
              // Extract string value
              const match = valueText.match(/["']([^"']+)["']/)
              if (match) {
                return match[1]
              }
            }
          }
        }
      }
    }

    // Default: convert PascalCase to snake_case and pluralize
    return this.toSnakeCase(className) + 's'
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '')
  }
}
