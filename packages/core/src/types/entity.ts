/**
 * Entity detection types for generating ER diagrams
 */

export type RelationshipType = 'oneToMany' | 'manyToOne' | 'manyToMany' | 'oneToOne'

export interface EntityField {
  /** Field name (e.g., "email") */
  name: string

  /** Field type (e.g., "string", "int", "timestamp") */
  type: string

  /** Is this field a primary key? */
  isPrimaryKey: boolean

  /** Is this field unique? */
  isUnique: boolean

  /** Is this field a foreign key? */
  isForeignKey: boolean

  /** Can this field be null? */
  isNullable: boolean

  /** Default value if any */
  defaultValue?: string

  /** Original type annotation from source code */
  originalType?: string
}

export interface Relationship {
  /** Type of relationship */
  type: RelationshipType

  /** Target entity name (e.g., "Task") */
  targetEntity: string

  /** Foreign key field name if applicable (e.g., "user_id") */
  foreignKey?: string

  /** Join table name for many-to-many relationships */
  through?: string

  /** Back-reference field name on target entity */
  backPopulates?: string

  /** Relationship label for diagram */
  label?: string
}

export interface Entity {
  /** Entity class name (e.g., "User") */
  name: string

  /** Database table name if different from entity name (e.g., "users") */
  tableName?: string

  /** Source file path */
  filePath: string

  /** Service name this entity belongs to */
  service: string

  /** Entity fields */
  fields: EntityField[]

  /** Relationships to other entities */
  relationships: Relationship[]

  /** Detection confidence (0-1) */
  confidence: number

  /** Detection signals that identified this as an entity */
  detectionSignals: string[]

  /** ORM/framework detected (e.g., "TypeORM", "SQLAlchemy", "Django") */
  framework?: string
}

export interface EntityGroup {
  /** Group name (e.g., "api-service Entities") */
  name: string

  /** Service or module name */
  service: string

  /** Entities in this group */
  entities: Entity[]
}

export interface EntityDetectionResult {
  /** All detected entities across all services */
  entities: Entity[]

  /** Entities grouped by service/module */
  groups: EntityGroup[]

  /** Total files scanned */
  filesScanned: number

  /** Files where entities were detected */
  filesWithEntities: number
}

/**
 * Entity detector interface
 */
export interface EntityDetector {
  /**
   * Detect entities in a source file
   * @param sourceCode File content
   * @param filePath File path for context
   * @param service Service name
   * @returns Detected entities
   */
  detectEntities(sourceCode: string, filePath: string, service: string): Entity[]

  /**
   * Check if a file likely contains entities based on path/name
   * @param filePath File path
   * @returns True if file should be scanned for entities
   */
  shouldScanFile(filePath: string): boolean

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[]
}
