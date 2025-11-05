import Parser from 'tree-sitter'
import TypeScript from 'tree-sitter-typescript'
import type {
  Entity,
  EntityDetector,
  EntityField,
  Relationship,
  RelationshipType,
} from '../../../types/entity.js'

/**
 * Map TypeScript/ORM type to Mermaid ER diagram type
 */
function mapToMermaidType(type: string): string {
  const lowerType = type.toLowerCase()

  // String types
  if (lowerType.includes('string') || lowerType.includes('varchar') || lowerType.includes('text')) {
    return 'string'
  }

  // Number types
  if (
    lowerType.includes('int') ||
    lowerType.includes('number') ||
    lowerType.includes('float') ||
    lowerType.includes('double') ||
    lowerType.includes('decimal')
  ) {
    return 'int'
  }

  // Boolean
  if (lowerType.includes('bool')) {
    return 'boolean'
  }

  // Date/Time
  if (lowerType.includes('date') || lowerType.includes('time')) {
    if (lowerType.includes('timestamp')) {
      return 'timestamp'
    }
    return 'date'
  }

  // JSON
  if (lowerType.includes('json')) {
    return 'json'
  }

  // UUID
  if (lowerType.includes('uuid')) {
    return 'uuid'
  }

  // Default to string
  return 'string'
}

export class TypeScriptEntityDetector implements EntityDetector {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(TypeScript.typescript)
  }

  shouldScanFile(filePath: string): boolean {
    // Check file extension
    if (!/\.(ts|tsx)$/.test(filePath)) {
      return false
    }

    // Skip test files
    if (/\.(test|spec)\.(ts|tsx)$/.test(filePath)) {
      return false
    }

    // Check directory patterns
    const entityDirs = ['models', 'entities', 'data', 'domain', 'schemas', 'database']
    const hasEntityDir = entityDirs.some((dir) => filePath.includes(`/${dir}/`))

    // Check file naming patterns
    const entityPatterns = ['.model.', '.entity.', '.schema.']
    const hasEntityPattern = entityPatterns.some((pattern) => filePath.includes(pattern))

    return hasEntityDir || hasEntityPattern
  }

  getSupportedExtensions(): string[] {
    return ['.ts', '.tsx']
  }

  detectEntities(sourceCode: string, filePath: string, service: string): Entity[] {
    const tree = this.parser.parse(sourceCode)
    const entities: Entity[] = []

    // Find all class declarations
    const classNodes = this.findClassDeclarations(tree.rootNode, sourceCode)

    for (const classNode of classNodes) {
      const entity = this.detectEntityFromClass(classNode, sourceCode, filePath, service)
      if (entity) {
        entities.push(entity)
      }
    }

    // Also find interface declarations (for projects using plain interfaces as models)
    const interfaceNodes = this.findInterfaceDeclarations(tree.rootNode, sourceCode)

    for (const interfaceNode of interfaceNodes) {
      const entity = this.detectEntityFromInterface(interfaceNode, sourceCode, filePath, service)
      if (entity) {
        entities.push(entity)
      }
    }

    return entities
  }

  private findClassDeclarations(node: Parser.SyntaxNode, _sourceCode: string): Parser.SyntaxNode[] {
    const classes: Parser.SyntaxNode[] = []

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'export_statement') {
        // For export statements, check the declaration child
        const declaration = n.childForFieldName('declaration')
        if (declaration && declaration.type === 'class_declaration') {
          classes.push(n) // Store the export_statement to preserve decorators
          // Don't traverse children - we already handled the class_declaration
          return
        }
      } else if (n.type === 'class_declaration') {
        // Only collect standalone class declarations (not exported)
        // Check if parent is export_statement
        if (n.parent?.type !== 'export_statement') {
          classes.push(n)
        }
      }
      n.children.forEach(traverse)
    }

    traverse(node)
    return classes
  }

  private detectEntityFromClass(
    node: Parser.SyntaxNode,
    sourceCode: string,
    filePath: string,
    service: string
  ): Entity | null {
    // Handle both direct class_declaration and export_statement wrapping a class
    let classNode = node
    if (node.type === 'export_statement') {
      const declaration = node.childForFieldName('declaration')
      if (!declaration || declaration.type !== 'class_declaration') return null
      classNode = declaration
    }

    // Get class name
    const nameNode = classNode.childForFieldName('name')
    if (!nameNode) return null

    const className = sourceCode.substring(nameNode.startIndex, nameNode.endIndex)

    // Detection signals
    const signals: string[] = []
    let confidence = 0

    // Check for @Entity decorator (TypeORM, MikroORM)
    // Check both the original node (export_statement) and the class node
    const hasEntityDecorator = this.hasDecorator(node, sourceCode, 'Entity')
    if (hasEntityDecorator) {
      signals.push('@Entity decorator')
      confidence += 0.5
    }

    // Check for @Table decorator (Sequelize-TypeScript)
    const hasTableDecorator = this.hasDecorator(node, sourceCode, 'Table')
    if (hasTableDecorator) {
      signals.push('@Table decorator')
      confidence += 0.5
    }

    // Check if extends BaseModel or Model
    const extendsClass = this.getExtendsClass(classNode, sourceCode)
    if (extendsClass && /^(Base)?Model|Entity|Table$/i.test(extendsClass)) {
      signals.push(`extends ${extendsClass}`)
      confidence += 0.4
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
    const fields = this.extractFields(classNode, sourceCode)

    // Extract relationships
    const relationships = this.extractRelationships(classNode, sourceCode)

    // Extract table name
    const tableName = this.extractTableName(node, sourceCode, className)

    // Determine framework
    let framework: string | undefined
    if (hasEntityDecorator) {
      framework = 'TypeORM' // Could also be MikroORM
    } else if (hasTableDecorator) {
      framework = 'Sequelize-TypeScript'
    }

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

  private hasDecorator(classNode: Parser.SyntaxNode, sourceCode: string, decoratorName: string): boolean {
    const decorators = classNode.children.filter((child) => child.type === 'decorator')

    return decorators.some((decorator) => {
      const text = sourceCode.substring(decorator.startIndex, decorator.endIndex)
      return text.includes(`@${decoratorName}`)
    })
  }

  private getExtendsClass(classNode: Parser.SyntaxNode, sourceCode: string): string | null {
    const heritageClause = classNode.children.find((child) => child.type === 'class_heritage')
    if (!heritageClause) return null

    const extendsClause = heritageClause.children.find((child) => child.type === 'extends_clause')
    if (!extendsClause) return null

    // Get the first type after 'extends'
    const typeNode = extendsClause.children.find((child) => child.type === 'type_identifier' || child.type === 'identifier')
    if (!typeNode) return null

    return sourceCode.substring(typeNode.startIndex, typeNode.endIndex)
  }

  private extractFields(classNode: Parser.SyntaxNode, sourceCode: string): EntityField[] {
    const fields: EntityField[] = []
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return fields

    for (const member of bodyNode.children) {
      if (member.type === 'property_declaration' || member.type === 'public_field_definition') {
        const field = this.extractField(member, sourceCode)
        if (field) {
          fields.push(field)
        }
      }
    }

    return fields
  }

  private extractField(fieldNode: Parser.SyntaxNode, sourceCode: string): EntityField | null {
    // Get field name
    const nameNode = fieldNode.childForFieldName('name')
    if (!nameNode) return null

    const fieldName = sourceCode.substring(nameNode.startIndex, nameNode.endIndex)

    // Get type annotation
    const typeNode = fieldNode.childForFieldName('type')
    const originalType = typeNode ? sourceCode.substring(typeNode.startIndex, typeNode.endIndex) : 'any'
    const type = mapToMermaidType(originalType)

    // Check decorators to determine field properties
    const decorators = fieldNode.children.filter((child) => child.type === 'decorator')
    const decoratorTexts = decorators.map((d) => sourceCode.substring(d.startIndex, d.endIndex))

    const isPrimaryKey = decoratorTexts.some((d) => d.includes('@PrimaryKey') || d.includes('@PrimaryGeneratedColumn') || d.includes('@id'))
    const isUnique = decoratorTexts.some((d) => d.includes('unique: true') || d.includes('@unique'))
    const isForeignKey = decoratorTexts.some((d) => d.includes('@ManyToOne') || d.includes('@Column') && fieldName.toLowerCase().endsWith('id'))

    // Check if nullable (ends with ? or includes null in type)
    const isNullable = originalType.includes('null') || originalType.includes('?') || originalType.includes('| undefined')

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

  private extractRelationships(classNode: Parser.SyntaxNode, sourceCode: string): Relationship[] {
    const relationships: Relationship[] = []
    const bodyNode = classNode.childForFieldName('body')
    if (!bodyNode) return relationships

    for (const member of bodyNode.children) {
      if (member.type === 'property_declaration' || member.type === 'public_field_definition') {
        const relationship = this.extractRelationship(member, sourceCode)
        if (relationship) {
          relationships.push(relationship)
        }
      }
    }

    return relationships
  }

  private extractRelationship(fieldNode: Parser.SyntaxNode, sourceCode: string): Relationship | null {
    const decorators = fieldNode.children.filter((child) => child.type === 'decorator')

    for (const decorator of decorators) {
      const decoratorText = sourceCode.substring(decorator.startIndex, decorator.endIndex)

      // OneToMany
      if (decoratorText.includes('@OneToMany')) {
        return this.parseRelationshipDecorator(decoratorText, 'oneToMany')
      }

      // ManyToOne
      if (decoratorText.includes('@ManyToOne')) {
        return this.parseRelationshipDecorator(decoratorText, 'manyToOne')
      }

      // ManyToMany
      if (decoratorText.includes('@ManyToMany')) {
        return this.parseRelationshipDecorator(decoratorText, 'manyToMany')
      }

      // OneToOne
      if (decoratorText.includes('@OneToOne')) {
        return this.parseRelationshipDecorator(decoratorText, 'oneToOne')
      }
    }

    return null
  }

  private parseRelationshipDecorator(decoratorText: string, type: RelationshipType): Relationship | null {
    // Extract target entity from decorator like @OneToMany(() => Task, ...)
    const match = decoratorText.match(/=>\s*([A-Z][a-zA-Z0-9_]*)/)
    if (!match || !match[1]) return null

    const targetEntity = match[1]

    return {
      type,
      targetEntity,
    }
  }

  private extractTableName(classNode: Parser.SyntaxNode, sourceCode: string, className: string): string | undefined {
    const decorators = classNode.children.filter((child) => child.type === 'decorator')

    for (const decorator of decorators) {
      const decoratorText = sourceCode.substring(decorator.startIndex, decorator.endIndex)

      // @Entity('table_name')
      const match = decoratorText.match(/@Entity\(['"`]([^'"`]+)['"`]\)/)
      if (match) {
        return match[1]
      }

      // @Table({ tableName: 'table_name' })
      const tableMatch = decoratorText.match(/tableName:\s*['"`]([^'"`]+)['"`]/)
      if (tableMatch) {
        return tableMatch[1]
      }
    }

    // Default: pluralize class name and lowercase
    return this.pluralize(className.toLowerCase())
  }

  private pluralize(word: string): string {
    // Simple pluralization rules
    if (word.endsWith('s')) return word
    if (word.endsWith('y')) return word.slice(0, -1) + 'ies'
    if (word.endsWith('ch') || word.endsWith('sh') || word.endsWith('x')) return word + 'es'
    return word + 's'
  }

  private findInterfaceDeclarations(node: Parser.SyntaxNode, _sourceCode: string): Parser.SyntaxNode[] {
    const interfaces: Parser.SyntaxNode[] = []

    const traverse = (n: Parser.SyntaxNode) => {
      if (n.type === 'export_statement') {
        const declaration = n.childForFieldName('declaration')
        if (declaration && declaration.type === 'interface_declaration') {
          interfaces.push(declaration)
          // Don't traverse children - we already handled the interface_declaration
          return
        }
      } else if (n.type === 'interface_declaration') {
        // Only collect standalone interface declarations (not exported)
        // Check if parent is export_statement
        if (n.parent?.type !== 'export_statement') {
          interfaces.push(n)
        }
      }
      n.children.forEach(traverse)
    }

    traverse(node)
    return interfaces
  }

  private detectEntityFromInterface(
    interfaceNode: Parser.SyntaxNode,
    sourceCode: string,
    filePath: string,
    service: string
  ): Entity | null {
    // Get interface name
    const nameNode = interfaceNode.childForFieldName('name')
    if (!nameNode) return null

    const interfaceName = sourceCode.substring(nameNode.startIndex, nameNode.endIndex)

    // Skip DTOs and input types (these are not entities)
    if (interfaceName.endsWith('Input') || interfaceName.endsWith('DTO') ||
        interfaceName.endsWith('Response') || interfaceName.endsWith('Request')) {
      return null
    }

    // Only detect interfaces in entity directories/files
    if (!this.shouldScanFile(filePath)) {
      return null
    }

    // Extract fields from interface
    const fields = this.extractInterfaceFields(interfaceNode, sourceCode)

    // Need at least some fields to be considered an entity
    if (fields.length === 0) {
      return null
    }

    const signals = ['interface in entity file']
    const confidence = 0.6 // Lower confidence for plain interfaces

    const entity: Entity = {
      name: interfaceName,
      filePath,
      service,
      fields,
      relationships: [], // Interfaces don't have explicit relationships
      confidence,
      detectionSignals: signals,
      tableName: this.pluralize(interfaceName.toLowerCase()),
    }

    return entity
  }

  private extractInterfaceFields(interfaceNode: Parser.SyntaxNode, sourceCode: string): EntityField[] {
    const fields: EntityField[] = []
    const bodyNode = interfaceNode.childForFieldName('body')
    if (!bodyNode) return fields

    for (const member of bodyNode.children) {
      if (member.type === 'property_signature') {
        const field = this.extractInterfaceField(member, sourceCode)
        if (field) {
          fields.push(field)
        }
      }
    }

    return fields
  }

  private extractInterfaceField(fieldNode: Parser.SyntaxNode, sourceCode: string): EntityField | null {
    // Get field name
    const nameNode = fieldNode.childForFieldName('name')
    if (!nameNode) return null

    const fieldName = sourceCode.substring(nameNode.startIndex, nameNode.endIndex)

    // Get type annotation
    const typeNode = fieldNode.childForFieldName('type')
    const originalType = typeNode ? sourceCode.substring(typeNode.startIndex, typeNode.endIndex) : 'any'
    const type = mapToMermaidType(originalType)

    // Infer field properties from naming conventions
    const lowerName = fieldName.toLowerCase()
    const isPrimaryKey = lowerName === 'id'
    const isForeignKey = lowerName.endsWith('id') && lowerName !== 'id'
    const isNullable = originalType.includes('null') || originalType.includes('?') || originalType.includes('| undefined')

    return {
      name: fieldName,
      type,
      originalType,
      isPrimaryKey,
      isUnique: false, // Can't infer from plain interface
      isForeignKey,
      isNullable,
    }
  }
}
