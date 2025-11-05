import { describe, it, expect } from 'vitest'
import { TypeScriptEntityDetector } from '../../analyzer/extractors/languages/typescript-entities.js'
import { PythonEntityDetector } from '../../analyzer/extractors/languages/python-entities.js'
import { shouldExtractEntities } from '../../analyzer/extractors/entities.js'
import type { FileAnalysis } from '../../types/index.js'

describe('Entity Detection', () => {
  describe('shouldExtractEntities', () => {
    it('should detect files with TypeORM imports', () => {
      const analysis: FileAnalysis = {
        filePath: 'src/models/user.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'typeorm',
            imports: [{ name: 'Entity', isDefault: false, isNamespace: false }],
            location: { filePath: 'test.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
        httpCalls: [],
      }

      expect(shouldExtractEntities(analysis)).toBe(true)
    })

    it('should detect files with Django imports', () => {
      const analysis: FileAnalysis = {
        filePath: 'app/models/user.py',
        language: 'python',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'django.db.models',
            imports: [{ name: 'Model', isDefault: false, isNamespace: false }],
            location: { filePath: 'test.py', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
        httpCalls: [],
      }

      expect(shouldExtractEntities(analysis)).toBe(true)
    })

    it('should detect entity files by path pattern', () => {
      const analysis: FileAnalysis = {
        filePath: 'src/models/user.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [],
        exports: [],
        calls: [],
        httpCalls: [],
      }

      expect(shouldExtractEntities(analysis)).toBe(true)
    })

    it('should not detect non-entity files', () => {
      const analysis: FileAnalysis = {
        filePath: 'src/controllers/user.ts',
        language: 'typescript',
        functions: [],
        classes: [],
        imports: [
          {
            source: 'express',
            imports: [{ name: 'Router', isDefault: false, isNamespace: false }],
            location: { filePath: 'test.ts', startLine: 1, endLine: 1 },
          },
        ],
        exports: [],
        calls: [],
        httpCalls: [],
      }

      expect(shouldExtractEntities(analysis)).toBe(false)
    })
  })

  describe('TypeScript Entity Detection', () => {
    const detector = new TypeScriptEntityDetector()

    describe('TypeORM Entities', () => {
      it('should detect TypeORM entity with decorators', () => {
        const code = `
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  name: string

  @Column({ unique: true })
  email: string
}
        `

        const entities = detector.detectEntities(code, 'src/models/user.ts', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].name).toBe('User')
        expect(entities[0].tableName).toBe('users')
        expect(entities[0].framework).toBe('TypeORM')
        expect(entities[0].fields).toHaveLength(3)
        expect(entities[0].fields[0].isPrimaryKey).toBe(true)
        expect(entities[0].fields[2].isUnique).toBe(true)
      })

      it('should detect OneToMany relationships', () => {
        const code = `
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Task } from './task'

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number

  @OneToMany(() => Task, task => task.user)
  tasks: Task[]
}
        `

        const entities = detector.detectEntities(code, 'src/models/user.ts', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].relationships).toHaveLength(1)
        expect(entities[0].relationships[0].type).toBe('oneToMany')
        expect(entities[0].relationships[0].targetEntity).toBe('Task')
      })

      it('should detect ManyToOne relationships', () => {
        const code = `
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm'
import { User } from './user'

@Entity()
export class Task {
  @PrimaryGeneratedColumn()
  id: number

  @ManyToOne(() => User, user => user.tasks)
  user: User
}
        `

        const entities = detector.detectEntities(code, 'src/models/task.ts', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].relationships).toHaveLength(1)
        expect(entities[0].relationships[0].type).toBe('manyToOne')
        expect(entities[0].relationships[0].targetEntity).toBe('User')
      })
    })

    describe('Sequelize-TypeScript Entities', () => {
      it('should detect Sequelize entity with @Table decorator', () => {
        const code = `
import { Table, Column, Model, PrimaryKey, AutoIncrement } from 'sequelize-typescript'

@Table
export class User extends Model {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number

  @Column
  name: string
}
        `

        const entities = detector.detectEntities(code, 'src/models/user.ts', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].name).toBe('User')
        expect(entities[0].framework).toBe('Sequelize-TypeScript')
      })
    })

    describe('BaseModel Extension', () => {
      it('should detect entity extending BaseModel', () => {
        const code = `
import { BaseModel } from './base'

export class User extends BaseModel {
  id: number
  name: string
  email: string
}
        `

        const entities = detector.detectEntities(code, 'src/models/user.model.ts', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].name).toBe('User')
        expect(entities[0].detectionSignals).toContain('extends BaseModel')
      })
    })

    describe('File Patterns', () => {
      it('should scan files in models directory', () => {
        expect(detector.shouldScanFile('src/models/user.ts')).toBe(true)
        expect(detector.shouldScanFile('src/entities/task.ts')).toBe(true)
        expect(detector.shouldScanFile('src/data/profile.ts')).toBe(true)
      })

      it('should scan files with entity naming patterns', () => {
        expect(detector.shouldScanFile('src/user.model.ts')).toBe(true)
        expect(detector.shouldScanFile('src/task.entity.ts')).toBe(true)
        expect(detector.shouldScanFile('src/profile.schema.ts')).toBe(true)
      })

      it('should not scan test files', () => {
        expect(detector.shouldScanFile('src/models/user.test.ts')).toBe(false)
        expect(detector.shouldScanFile('src/models/user.spec.ts')).toBe(false)
      })

      it('should not scan controller files', () => {
        expect(detector.shouldScanFile('src/controllers/user.ts')).toBe(false)
      })
    })

    describe('Confidence Scoring', () => {
      it('should have high confidence for entity with decorator', () => {
        const code = `
import { Entity, Column } from 'typeorm'

@Entity()
export class User {
  @Column()
  name: string
}
        `

        const entities = detector.detectEntities(code, 'src/models/user.ts', 'api-service')

        expect(entities[0].confidence).toBeGreaterThanOrEqual(0.7)
      })

      it('should not detect classes without entity patterns', () => {
        const code = `
export class UserService {
  getUser(id: number) {
    return null
  }
}
        `

        const entities = detector.detectEntities(code, 'src/services/user.ts', 'api-service')

        expect(entities).toHaveLength(0)
      })
    })
  })

  describe('Python Entity Detection', () => {
    const detector = new PythonEntityDetector()

    describe('Django ORM Entities', () => {
      it('should detect Django model', () => {
        const code = `
from django.db import models

class User(models.Model):
    name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
        `

        const entities = detector.detectEntities(code, 'app/models/user.py', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].name).toBe('User')
        expect(entities[0].framework).toBe('Django')
        expect(entities[0].fields).toHaveLength(3)
        expect(entities[0].fields[1].isUnique).toBe(true)
      })

      it('should detect Django ForeignKey relationships', () => {
        const code = `
from django.db import models

class Task(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
        `

        const entities = detector.detectEntities(code, 'app/models/task.py', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].relationships).toHaveLength(1)
        expect(entities[0].relationships[0].type).toBe('manyToOne')
        expect(entities[0].relationships[0].targetEntity).toBe('User')
      })

      it('should detect Django ManyToMany relationships', () => {
        const code = `
from django.db import models

class Project(models.Model):
    members = models.ManyToManyField(User)
    name = models.CharField(max_length=100)
        `

        const entities = detector.detectEntities(code, 'app/models/project.py', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].relationships).toHaveLength(1)
        expect(entities[0].relationships[0].type).toBe('manyToMany')
        expect(entities[0].relationships[0].targetEntity).toBe('User')
      })
    })

    describe('SQLAlchemy Entities', () => {
      it('should detect SQLAlchemy model', () => {
        const code = `
from sqlalchemy import Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True)
    name = Column(String)
    email = Column(String, unique=True)
        `

        const entities = detector.detectEntities(code, 'app/models/user.py', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].name).toBe('User')
        expect(entities[0].tableName).toBe('users')
        expect(entities[0].framework).toBe('SQLAlchemy')
        expect(entities[0].fields[0].isPrimaryKey).toBe(true)
      })

      it('should detect SQLAlchemy relationships', () => {
        const code = `
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from .base import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    tasks = relationship("Task", back_populates="user")
        `

        const entities = detector.detectEntities(code, 'app/models/user.py', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].relationships).toHaveLength(1)
        expect(entities[0].relationships[0].type).toBe('oneToMany')
        expect(entities[0].relationships[0].targetEntity).toBe('Task')
      })
    })

    describe('Pydantic with ORM Mode', () => {
      it('should detect Pydantic model with orm_mode', () => {
        const code = `
from pydantic import BaseModel

class User(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        orm_mode = True
        `

        const entities = detector.detectEntities(code, 'app/models/user.py', 'api-service')

        expect(entities).toHaveLength(1)
        expect(entities[0].name).toBe('User')
        expect(entities[0].framework).toBe('Pydantic')
      })

      it('should not detect Pydantic model without orm_mode', () => {
        const code = `
from pydantic import BaseModel

class UserDTO(BaseModel):
    id: int
    name: str
        `

        const entities = detector.detectEntities(code, 'app/schemas/user.py', 'api-service')

        // Should have low confidence or not detect at all
        expect(entities.length).toBe(0)
      })
    })

    describe('File Patterns', () => {
      it('should scan files in models directory', () => {
        expect(detector.shouldScanFile('app/models/user.py')).toBe(true)
        expect(detector.shouldScanFile('app/entities/task.py')).toBe(true)
      })

      it('should scan files with model naming patterns', () => {
        expect(detector.shouldScanFile('app/user_model.py')).toBe(true)
        expect(detector.shouldScanFile('app/task_entity.py')).toBe(true)
      })

      it('should not scan test files', () => {
        expect(detector.shouldScanFile('app/models/test_user.py')).toBe(false)
        expect(detector.shouldScanFile('app/models/user_test.py')).toBe(false)
      })
    })

    describe('Table Name Extraction', () => {
      it('should extract __tablename__ attribute', () => {
        const code = `
from sqlalchemy import Column, Integer
from .base import Base

class User(Base):
    __tablename__ = 'app_users'
    id = Column(Integer, primary_key=True)
        `

        const entities = detector.detectEntities(code, 'app/models/user.py', 'api-service')

        expect(entities[0].tableName).toBe('app_users')
      })

      it('should generate default table name from class name', () => {
        const code = `
from django.db import models

class UserProfile(models.Model):
    name = models.CharField(max_length=100)
        `

        const entities = detector.detectEntities(code, 'app/models/user.py', 'api-service')

        expect(entities[0].tableName).toBe('user_profiles')
      })
    })
  })
})
