import Parser from 'tree-sitter'
import Python from 'tree-sitter-python'
import type {
  Entity,
  EntityDetector,
  EntityField,
  Relationship,
} from '../../../types/entity.js'

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

    // Check base classes
    const baseClasses = this.getBaseClasses(classNode, sourceCode)

    // Django ORM: class extends models.Model
    if (baseClasses.some((base) => base.includes('models.Model') || base === 'Model')) {
      signals.push('extends models.Model (Django)')
      confidence += 0.6
      framework = 'Django'
    }

    // SQLAlchemy: class extends Base or DeclarativeBase
    if (baseClasses.some((base) => base === 'Base' || base === 'DeclarativeBase')) {
      signals.push('extends Base (SQLAlchemy)')
      confidence += 0.6
      framework = 'SQLAlchemy'
    }

    // Pydantic BaseModel with orm_mode
    if (baseClasses.some((base) => base.includes('BaseModel'))) {
      const hasOrmMode = this.hasOrmMode(classNode, sourceCode)
      if (hasOrmMode) {
        signals.push('extends BaseModel with orm_mode (Pydantic)')
        confidence += 0.5
        framework = 'Pydantic'
      }
      // Note: Pydantic without orm_mode is likely a DTO/schema, not an entity
      // Don't add any confidence for BaseModel alone
    }

    // Check for __tablename__ attribute (SQLAlchemy)
    if (this.hasTableName(classNode, sourceCode)) {
      signals.push('has __tablename__ attribute')
      confidence += 0.3
      if (!framework) framework = 'SQLAlchemy'
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

    // Detect field type based on framework
    let type = 'string'
    let isPrimaryKey = false
    let isUnique = false
    let isForeignKey = false
    let isNullable = false
    let originalType = ''

    if (framework === 'Django') {
      // Django: field = models.CharField(...)
      originalType = rightText
      if (rightText.includes('CharField') || rightText.includes('TextField') || rightText.includes('EmailField')) {
        type = 'string'
      } else if (rightText.includes('IntegerField') || rightText.includes('AutoField') || rightText.includes('BigIntegerField')) {
        type = 'int'
      } else if (rightText.includes('BooleanField')) {
        type = 'boolean'
      } else if (rightText.includes('DateTimeField')) {
        type = 'timestamp'
      } else if (rightText.includes('DateField')) {
        type = 'date'
      }

      isPrimaryKey = rightText.includes('primary_key=True')
      isUnique = rightText.includes('unique=True')
      isForeignKey = rightText.includes('ForeignKey')
      isNullable = rightText.includes('null=True')
    } else if (framework === 'SQLAlchemy') {
      // SQLAlchemy: field = Column(Integer, ...)
      originalType = rightText
      if (rightText.includes('Column')) {
        if (rightText.includes('String') || rightText.includes('Text')) {
          type = 'string'
        } else if (rightText.includes('Integer')) {
          type = 'int'
        } else if (rightText.includes('Boolean')) {
          type = 'boolean'
        } else if (rightText.includes('DateTime')) {
          type = 'timestamp'
        } else if (rightText.includes('Date')) {
          type = 'date'
        }

        isPrimaryKey = rightText.includes('primary_key=True')
        isUnique = rightText.includes('unique=True')
        isForeignKey = rightText.includes('ForeignKey')
        isNullable = rightText.includes('nullable=True')
      } else if (rightText.includes('relationship')) {
        // This is a relationship, not a field
        return null
      }
    } else if (framework === 'Pydantic') {
      // Pydantic: field: str or field: Optional[str]
      // Type annotations are typically in annotated assignments
      // For now, skip or try to infer from right side
      return null // Pydantic fields need type annotation parsing
    }

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

    if (framework === 'Django') {
      // ForeignKey
      if (rightText.includes('ForeignKey')) {
        const match = rightText.match(/ForeignKey\s*\(\s*([A-Z][a-zA-Z0-9_]*)/)
        if (match && match[1]) {
          return {
            type: 'manyToOne',
            targetEntity: match[1],
          }
        }
      }

      // ManyToManyField
      if (rightText.includes('ManyToManyField')) {
        const match = rightText.match(/ManyToManyField\s*\(\s*([A-Z][a-zA-Z0-9_]*)/)
        if (match && match[1]) {
          return {
            type: 'manyToMany',
            targetEntity: match[1],
          }
        }
      }

      // OneToOneField
      if (rightText.includes('OneToOneField')) {
        const match = rightText.match(/OneToOneField\s*\(\s*([A-Z][a-zA-Z0-9_]*)/)
        if (match && match[1]) {
          return {
            type: 'oneToOne',
            targetEntity: match[1],
          }
        }
      }
    } else if (framework === 'SQLAlchemy') {
      // relationship("TargetEntity", ...)
      if (rightText.includes('relationship')) {
        const match = rightText.match(/relationship\s*\(\s*["']([A-Z][a-zA-Z0-9_]*)["']/)
        if (match && match[1]) {
          // Determine type by checking back_populates or looking at the field type
          // For now, assume oneToMany
          return {
            type: 'oneToMany',
            targetEntity: match[1],
          }
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
