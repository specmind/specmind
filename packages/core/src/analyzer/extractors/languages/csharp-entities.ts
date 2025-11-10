import Parser from 'tree-sitter'
import CSharp from 'tree-sitter-c-sharp'
import type {
  Entity,
  EntityDetector,
  EntityField,
  Relationship,
} from '../../../types/entity.js'
import { detectFrameworkFromSource, getOrmDetectionPatterns, getOrmDisplayName } from '../framework-detector.js'

/**
 * Map C# type to Mermaid ER diagram type
 */
function mapToMermaidType(type: string): string {
  const lowerType = type.toLowerCase()

  // String types
  if (lowerType.includes('string')) {
    return 'string'
  }

  // Number types
  if (
    lowerType.includes('int') ||
    lowerType.includes('long') ||
    lowerType.includes('short') ||
    lowerType.includes('byte')
  ) {
    return 'int'
  }

  // Decimal types
  if (lowerType.includes('decimal') || lowerType.includes('double') || lowerType.includes('float')) {
    return 'decimal'
  }

  // Boolean
  if (lowerType.includes('bool')) {
    return 'boolean'
  }

  // Date/Time
  if (lowerType.includes('datetime') || lowerType.includes('datetimeoffset')) {
    return 'timestamp'
  }
  if (lowerType.includes('date')) {
    return 'date'
  }

  // JSON
  if (lowerType.includes('json')) {
    return 'json'
  }

  // UUID/GUID
  if (lowerType.includes('guid') || lowerType.includes('uuid')) {
    return 'uuid'
  }

  // Binary
  if (lowerType.includes('byte[]') || lowerType.includes('binary')) {
    return 'binary'
  }

  // Default to string
  return 'string'
}

export class CSharpEntityDetector implements EntityDetector {
  private parser: Parser

  constructor() {
    this.parser = new Parser()
    this.parser.setLanguage(CSharp)
  }

  shouldScanFile(filePath: string): boolean {
    // Check file extension
    if (!/\.cs$/.test(filePath)) {
      return false
    }

    // Skip test files
    if (/\.Tests?\.cs$/.test(filePath) || /Tests?\.cs$/.test(filePath)) {
      return false
    }

    // Check directory patterns (C# uses PascalCase)
    const entityDirs = ['Models', 'Entities', 'Data', 'Domain', 'Schemas', 'Database']
    const hasEntityDir = entityDirs.some((dir) => filePath.includes(`/${dir}/`) || filePath.includes(`\\${dir}\\`))

    // Check file naming patterns
    const entityPatterns = ['.Model.', '.Entity.', '.Schema.']
    const hasEntityPattern = entityPatterns.some((pattern) => filePath.includes(pattern))

    return hasEntityDir || hasEntityPattern
  }

  getSupportedExtensions(): string[] {
    return ['.cs']
  }

  detectEntities(sourceCode: string, filePath: string, service: string): Entity[] {
    const tree = this.parser.parse(sourceCode)
    const entities: Entity[] = []

    // Find all class declarations
    const classNodes = this.findClassDeclarations(tree.rootNode)
    for (const classNode of classNodes) {
      const entity = this.detectEntityFromClass(classNode, sourceCode, filePath, service)
      if (entity) {
        entities.push(entity)
      }
    }

    // Find record declarations (C# 9+)
    const recordNodes = this.findRecordDeclarations(tree.rootNode)
    for (const recordNode of recordNodes) {
      const entity = this.detectEntityFromRecord(recordNode, sourceCode, filePath, service)
      if (entity) {
        entities.push(entity)
      }
    }

    return entities
  }

  private findClassDeclarations(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const classes: Parser.SyntaxNode[] = []

    if (node.type === 'class_declaration') {
      classes.push(node)
    }

    for (const child of node.children) {
      classes.push(...this.findClassDeclarations(child))
    }

    return classes
  }

  private findRecordDeclarations(node: Parser.SyntaxNode): Parser.SyntaxNode[] {
    const records: Parser.SyntaxNode[] = []

    if (node.type === 'record_declaration') {
      records.push(node)
    }

    for (const child of node.children) {
      records.push(...this.findRecordDeclarations(child))
    }

    return records
  }

  private detectEntityFromClass(
    classNode: Parser.SyntaxNode,
    sourceCode: string,
    filePath: string,
    service: string
  ): Entity | null {
    const signals: string[] = []
    let confidence = 0
    let framework: string | undefined

    // Detect framework from imports/using statements first
    const detectedFramework = detectFrameworkFromSource(sourceCode, 'csharp')
    if (detectedFramework) {
      framework = detectedFramework
    }

    // Get ORM detection patterns from config
    const ormPatterns = getOrmDetectionPatterns('csharp')

    // Check each ORM pattern from config
    for (const [ormPackage, patternData] of Object.entries(ormPatterns)) {
      const pattern = patternData as any

      // Skip if class extends an excluded base class
      if (pattern.excludeBaseClasses && pattern.excludeBaseClasses.length > 0) {
        const baseClasses = this.getBaseClasses(classNode)
        const hasExcludedBase = baseClasses.some((b: string) =>
          pattern.excludeBaseClasses.some((excluded: string) => b === excluded)
        )
        if (hasExcludedBase) {
          continue // Skip this ORM pattern
        }
      }

      // Check attribute patterns
      if (pattern.attributes && pattern.attributes.length > 0) {
        const hasAttribute = pattern.attributes.some((attr: string) =>
          this.hasAttribute(classNode, attr)
        )

        if (hasAttribute) {
          const displayName = getOrmDisplayName(ormPackage)
          signals.push(`${pattern.signal} (${displayName})`)
          confidence += pattern.confidenceScore
        }
      }

      // Check base class patterns
      if (pattern.baseClassPatterns && pattern.baseClassPatterns.length > 0) {
        const baseClasses = this.getBaseClasses(classNode)
        const matchesBaseClass = baseClasses.some((b: string) =>
          pattern.baseClassPatterns.some((p: string) => b === p)
        )

        if (matchesBaseClass) {
          const displayName = getOrmDisplayName(ormPackage)
          signals.push(`extends ${baseClasses.join(', ')} (${displayName})`)
          confidence += pattern.confidenceScore
        }
      }

      // Check interface patterns
      if (pattern.interfaces && pattern.interfaces.length > 0) {
        const interfaces = this.getInterfaces(classNode)
        const matchesInterface = interfaces.some((i: string) =>
          pattern.interfaces.some((p: string) => i.includes(p))
        )

        if (matchesInterface) {
          const displayName = getOrmDisplayName(ormPackage)
          signals.push(`implements IEntityTypeConfiguration (${displayName})`)
          confidence += pattern.confidenceScore
        }
      }

      // Check virtual properties pattern (NHibernate)
      if (pattern.virtualProperties) {
        const hasVirtualProperties = this.hasVirtualProperties(classNode)
        if (hasVirtualProperties) {
          const displayName = getOrmDisplayName(ormPackage)
          signals.push(`${pattern.signal} (${displayName})`)
          confidence += pattern.confidenceScore
        }
      }
    }

    // File location check
    if (this.shouldScanFile(filePath)) {
      signals.push('in entity directory')
      confidence += 0.2
    }

    // Minimum confidence threshold
    if (confidence < 0.4) return null

    const className = this.getClassName(classNode)
    const fields = this.extractFields(classNode, sourceCode)
    const relationships = this.extractRelationships(classNode, sourceCode)
    const tableName = this.extractTableName(classNode) || className

    const entity: Entity = {
      name: className,
      filePath,
      service,
      fields,
      relationships,
      confidence,
      detectionSignals: signals,
      tableName,
    }

    if (framework) {
      entity.framework = framework
    }

    return entity
  }

  private detectEntityFromRecord(
    recordNode: Parser.SyntaxNode,
    sourceCode: string,
    filePath: string,
    service: string
  ): Entity | null {
    const signals: string[] = []
    let confidence = 0
    let framework: string | undefined

    // Detect framework from imports/using statements
    const detectedFramework = detectFrameworkFromSource(sourceCode, 'csharp')
    if (detectedFramework) {
      framework = detectedFramework
    }

    // Check for [Table] attribute
    const hasTableAttr = this.hasAttribute(recordNode, 'Table')
    if (hasTableAttr) {
      signals.push('[Table] attribute on record')
      confidence += 0.5
    }

    // File location check
    if (this.shouldScanFile(filePath)) {
      signals.push('in entity directory')
      confidence += 0.2
    }

    // Minimum confidence threshold
    if (confidence < 0.4) return null

    const recordName = this.getClassName(recordNode)
    const fields = this.extractRecordFields(recordNode, sourceCode)
    const tableName = this.extractTableName(recordNode) || recordName

    const entity: Entity = {
      name: recordName,
      filePath,
      service,
      fields,
      relationships: [],
      confidence,
      detectionSignals: signals,
      tableName,
    }

    if (framework) {
      entity.framework = framework
    }

    return entity
  }

  private hasAttribute(node: Parser.SyntaxNode, attrName: string): boolean {
    for (const child of node.children) {
      if (child.type === 'attribute_list') {
        const text = child.text
        if (text.includes(`[${attrName}]`) || text.includes(`[${attrName}(`)) {
          return true
        }
      }
    }
    return false
  }

  private getBaseClasses(node: Parser.SyntaxNode): string[] {
    const baseClasses: string[] = []

    for (const child of node.children) {
      if (child.type === 'base_list') {
        for (const baseNode of child.namedChildren) {
          const baseParts = baseNode.text.split('<')
          if (baseParts.length > 0 && baseParts[0]) {
            baseClasses.push(baseParts[0].trim())
          }
        }
      }
    }

    return baseClasses
  }

  private getInterfaces(node: Parser.SyntaxNode): string[] {
    // In C#, both base classes and interfaces are in base_list
    const baseClasses = this.getBaseClasses(node)
    return baseClasses.filter((name) => name.startsWith('I') && name.length > 1)
  }

  private hasVirtualProperties(node: Parser.SyntaxNode): boolean {
    const bodyNode = node.childForFieldName('body')
    if (!bodyNode) return false

    let virtualCount = 0
    let totalProperties = 0

    for (const member of bodyNode.namedChildren) {
      if (member.type === 'property_declaration') {
        totalProperties++
        if (member.text.includes('virtual')) {
          virtualCount++
        }
      }
    }

    // If more than 50% of properties are virtual, likely NHibernate
    return totalProperties > 0 && virtualCount / totalProperties > 0.5
  }

  private extractFields(node: Parser.SyntaxNode, _sourceCode: string): EntityField[] {
    const fields: EntityField[] = []
    const bodyNode = node.childForFieldName('body')
    if (!bodyNode) return fields

    for (const member of bodyNode.namedChildren) {
      if (member.type === 'property_declaration') {
        const nameNode = member.childForFieldName('name')
        const typeNode = member.childForFieldName('type')

        if (nameNode && typeNode) {
          const name = nameNode.text
          const rawType = typeNode.text
          const type = mapToMermaidType(rawType)

          // Check for key attributes
          const isPrimaryKey = this.hasAttribute(member, 'Key') || name.toLowerCase() === 'id'
          const isUnique = this.hasAttribute(member, 'Unique')
          const isForeignKey = this.hasAttribute(member, 'ForeignKey') || name.endsWith('Id')
          const isNullable = rawType.includes('?') || rawType.toLowerCase().includes('nullable')

          fields.push({
            name,
            type,
            isPrimaryKey,
            isUnique,
            isForeignKey,
            isNullable,
          })
        }
      }
    }

    return fields
  }

  private extractRecordFields(node: Parser.SyntaxNode, _sourceCode: string): EntityField[] {
    const fields: EntityField[] = []

    // Records can have parameters in the declaration
    const paramsNode = node.childForFieldName('parameters')
    if (paramsNode) {
      for (const param of paramsNode.namedChildren) {
        if (param.type === 'parameter') {
          const nameNode = param.childForFieldName('name')
          const typeNode = param.childForFieldName('type')

          if (nameNode && typeNode) {
            const name = nameNode.text
            const rawType = typeNode.text
            const type = mapToMermaidType(rawType)

            fields.push({
              name,
              type,
              isPrimaryKey: name.toLowerCase() === 'id',
              isUnique: false,
              isForeignKey: name.endsWith('Id'),
              isNullable: rawType.includes('?'),
            })
          }
        }
      }
    }

    return fields
  }

  private extractRelationships(node: Parser.SyntaxNode, _sourceCode: string): Relationship[] {
    const relationships: Relationship[] = []
    const bodyNode = node.childForFieldName('body')
    if (!bodyNode) return relationships

    for (const member of bodyNode.namedChildren) {
      if (member.type === 'property_declaration') {
        const nameNode = member.childForFieldName('name')
        const typeNode = member.childForFieldName('type')

        if (nameNode && typeNode) {
          const typeText = typeNode.text

          // OneToMany: ICollection<Task>, List<Task>
          if (typeText.includes('ICollection<') || typeText.includes('List<')) {
            const match = typeText.match(/(?:ICollection|List)<(\w+)>/)
            if (match && match[1]) {
              relationships.push({
                type: 'oneToMany',
                targetEntity: match[1],
              })
            }
          }
          // ManyToOne: Single entity reference with [ForeignKey]
          else if (this.hasAttribute(member, 'ForeignKey')) {
            const parts = typeText.split('<')
            if (parts.length > 0) {
              const targetEntity = parts[0]?.trim()
              if (targetEntity) {
                relationships.push({
                  type: 'manyToOne',
                  targetEntity,
                })
              }
            }
          }
          // OneToOne: Single entity reference
          else if (!typeText.includes('<') && typeText.match(/^[A-Z]\w+$/)) {
            // Check if it's likely an entity (PascalCase, not a primitive)
            const primitives = ['String', 'Int32', 'Int64', 'Boolean', 'DateTime', 'Decimal', 'Guid']
            const parts = typeText.split('?')
            if (parts.length > 0) {
              const targetEntity = parts[0]
              if (targetEntity && !primitives.includes(targetEntity)) {
                relationships.push({
                  type: 'oneToOne',
                  targetEntity,
                })
              }
            }
          }
        }
      }
    }

    return relationships
  }

  private extractTableName(node: Parser.SyntaxNode): string | undefined {
    for (const child of node.children) {
      if (child.type === 'attribute_list') {
        const text = child.text
        const match = text.match(/\[Table\s*\(\s*["'](\w+)["']\s*\)\]/)
        if (match) {
          return match[1]
        }
      }
    }
    return undefined
  }

  private getClassName(node: Parser.SyntaxNode): string {
    const nameNode = node.childForFieldName('name')
    return nameNode?.text || 'Anonymous'
  }
}
