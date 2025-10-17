import { describe, it, expect } from 'vitest'
import {
  slugify,
  createFeatureName,
  isValidSlug,
  extractSlugFromFilename,
  getFeatureFilePath,
  getSystemFilePath
} from './utils.js'

describe('slugify', () => {
  it('converts simple names to kebab-case', () => {
    expect(slugify('User Auth')).toBe('user-auth')
    expect(slugify('Payment Flow')).toBe('payment-flow')
    expect(slugify('Real-time Notifications')).toBe('real-time-notifications')
  })

  it('handles special characters', () => {
    expect(slugify('User@Auth!')).toBe('user-auth')
    expect(slugify('API (v2) Integration')).toBe('api-v2-integration')
    expect(slugify('WebSocket & SSE Events')).toBe('websocket-sse-events')
  })

  it('removes leading and trailing hyphens', () => {
    expect(slugify('  User Auth  ')).toBe('user-auth')
    expect(slugify('-User Auth-')).toBe('user-auth')
    expect(slugify('---Special---')).toBe('special')
  })

  it('handles already kebab-case names', () => {
    expect(slugify('user-auth')).toBe('user-auth')
    expect(slugify('payment-processing')).toBe('payment-processing')
  })

  it('collapses multiple separators', () => {
    expect(slugify('User   Auth')).toBe('user-auth')
    expect(slugify('User---Auth')).toBe('user-auth')
    expect(slugify('User___Auth')).toBe('user-auth')
  })
})

describe('createFeatureName', () => {
  it('creates valid FeatureName objects', () => {
    const result = createFeatureName('User Authentication')

    expect(result.original).toBe('User Authentication')
    expect(result.slug).toBe('user-authentication')
    expect(result.filename).toBe('user-authentication.sm')
  })

  it('validates slugs according to schema', () => {
    expect(() => createFeatureName('Valid Name')).not.toThrow()
    expect(() => createFeatureName('a')).not.toThrow()
    expect(() => createFeatureName('complex-feature-name-123')).not.toThrow()
  })
})

describe('isValidSlug', () => {
  it('accepts valid kebab-case slugs', () => {
    expect(isValidSlug('user-auth')).toBe(true)
    expect(isValidSlug('payment-flow')).toBe(true)
    expect(isValidSlug('a')).toBe(true)
    expect(isValidSlug('feature-123')).toBe(true)
    expect(isValidSlug('complex-feature-name-with-numbers-123')).toBe(true)
  })

  it('rejects invalid slugs', () => {
    expect(isValidSlug('UserAuth')).toBe(false) // PascalCase
    expect(isValidSlug('user_auth')).toBe(false) // snake_case
    expect(isValidSlug('user-')).toBe(false) // trailing hyphen
    expect(isValidSlug('-user')).toBe(false) // leading hyphen
    expect(isValidSlug('user--auth')).toBe(false) // double hyphen
    expect(isValidSlug('')).toBe(false) // empty
    expect(isValidSlug('user auth')).toBe(false) // spaces
    expect(isValidSlug('user@auth')).toBe(false) // special chars
  })
})

describe('extractSlugFromFilename', () => {
  it('extracts valid slugs from .sm filenames', () => {
    expect(extractSlugFromFilename('user-auth.sm')).toBe('user-auth')
    expect(extractSlugFromFilename('payment-flow.sm')).toBe('payment-flow')
    expect(extractSlugFromFilename('feature-123.sm')).toBe('feature-123')
  })

  it('returns null for invalid filenames', () => {
    expect(extractSlugFromFilename('user-auth.txt')).toBe(null)
    expect(extractSlugFromFilename('user-auth')).toBe(null)
    expect(extractSlugFromFilename('User-Auth.sm')).toBe(null) // invalid slug
    expect(extractSlugFromFilename('user_auth.sm')).toBe(null) // invalid slug
    expect(extractSlugFromFilename('.sm')).toBe(null) // empty slug
  })
})

describe('getFeatureFilePath', () => {
  it('returns correct feature file paths', () => {
    expect(getFeatureFilePath('user-auth')).toBe('.specmind/features/user-auth.sm')
    expect(getFeatureFilePath('payment-flow')).toBe('.specmind/features/payment-flow.sm')
  })
})

describe('getSystemFilePath', () => {
  it('returns correct system file path', () => {
    expect(getSystemFilePath()).toBe('.specmind/system.sm')
  })
})