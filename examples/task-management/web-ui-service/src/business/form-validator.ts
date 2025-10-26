/**
 * Form Validator - Client-side validation logic
 * Business Layer - Validates user input before submission
 */

import { CreateTaskDTO, UpdateTaskDTO, TaskPriority } from '../data/types.js';

export interface ValidationError {
  field: string;
  message: string;
}

export class FormValidator {
  validateCreateTask(data: CreateTaskDTO): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!data.title || data.title.trim().length === 0) {
      errors.push({ field: 'title', message: 'Title is required' });
    } else if (data.title.length > 200) {
      errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
    }

    if (!data.description || data.description.trim().length === 0) {
      errors.push({ field: 'description', message: 'Description is required' });
    } else if (data.description.length > 2000) {
      errors.push({ field: 'description', message: 'Description must be less than 2000 characters' });
    }

    if (!Object.values(TaskPriority).includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority value' });
    }

    return errors;
  }

  validateUpdateTask(data: UpdateTaskDTO): ValidationError[] {
    const errors: ValidationError[] = [];

    if (data.title !== undefined) {
      if (data.title.trim().length === 0) {
        errors.push({ field: 'title', message: 'Title cannot be empty' });
      } else if (data.title.length > 200) {
        errors.push({ field: 'title', message: 'Title must be less than 200 characters' });
      }
    }

    if (data.description !== undefined) {
      if (data.description.trim().length === 0) {
        errors.push({ field: 'description', message: 'Description cannot be empty' });
      } else if (data.description.length > 2000) {
        errors.push({ field: 'description', message: 'Description must be less than 2000 characters' });
      }
    }

    if (data.priority !== undefined && !Object.values(TaskPriority).includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority value' });
    }

    return errors;
  }
}
