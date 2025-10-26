/**
 * Task Validator - Business logic for validating task data
 * Business Layer - Enforces business rules for task operations
 */

import { CreateTaskInput, UpdateTaskInput, TaskPriority } from '../data/models.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export class TaskValidator {
  validateCreateTask(input: CreateTaskInput): ValidationResult {
    const errors: string[] = [];

    if (!input.title || input.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (input.title && input.title.length > 200) {
      errors.push('Title must be less than 200 characters');
    }

    if (!input.description || input.description.trim().length === 0) {
      errors.push('Description is required');
    }

    if (input.description && input.description.length > 2000) {
      errors.push('Description must be less than 2000 characters');
    }

    if (!Object.values(TaskPriority).includes(input.priority)) {
      errors.push('Invalid priority value');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateUpdateTask(input: UpdateTaskInput): ValidationResult {
    const errors: string[] = [];

    if (input.title !== undefined) {
      if (input.title.trim().length === 0) {
        errors.push('Title cannot be empty');
      }
      if (input.title.length > 200) {
        errors.push('Title must be less than 200 characters');
      }
    }

    if (input.description !== undefined) {
      if (input.description.trim().length === 0) {
        errors.push('Description cannot be empty');
      }
      if (input.description.length > 2000) {
        errors.push('Description must be less than 2000 characters');
      }
    }

    if (input.priority !== undefined && !Object.values(TaskPriority).includes(input.priority)) {
      errors.push('Invalid priority value');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
