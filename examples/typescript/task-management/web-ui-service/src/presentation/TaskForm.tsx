/**
 * TaskForm Component
 * Presentation Layer - Form for creating/editing tasks
 */

import React, { useState } from 'react';
import { CreateTaskDTO, TaskPriority } from '../data/types.js';
import { FormValidator, ValidationError } from '../business/form-validator.js';

interface TaskFormProps {
  validator: FormValidator;
  onSubmit: (data: CreateTaskDTO) => Promise<void>;
  onCancel: () => void;
}

export const TaskForm: React.FC<TaskFormProps> = ({ validator, onSubmit, onCancel }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<TaskPriority>(TaskPriority.MEDIUM);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const getFieldError = (field: string): string | undefined => {
    return errors.find(e => e.field === field)?.message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: CreateTaskDTO = {
      title,
      description,
      priority
    };

    // Validate
    const validationErrors = validator.validateCreateTask(data);
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Submit
    setSubmitting(true);
    setErrors([]);

    try {
      await onSubmit(data);
    } catch (error) {
      setErrors([{ field: 'general', message: 'Failed to create task' }]);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <h2>Create New Task</h2>

      {errors.find(e => e.field === 'general') && (
        <div className="error-message">
          {errors.find(e => e.field === 'general')?.message}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title">Title</label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter task title"
          disabled={submitting}
        />
        {getFieldError('title') && (
          <span className="field-error">{getFieldError('title')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Enter task description"
          rows={5}
          disabled={submitting}
        />
        {getFieldError('description') && (
          <span className="field-error">{getFieldError('description')}</span>
        )}
      </div>

      <div className="form-group">
        <label htmlFor="priority">Priority</label>
        <select
          id="priority"
          value={priority}
          onChange={(e) => setPriority(e.target.value as TaskPriority)}
          disabled={submitting}
        >
          <option value={TaskPriority.LOW}>Low</option>
          <option value={TaskPriority.MEDIUM}>Medium</option>
          <option value={TaskPriority.HIGH}>High</option>
        </select>
        {getFieldError('priority') && (
          <span className="field-error">{getFieldError('priority')}</span>
        )}
      </div>

      <div className="form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? 'Creating...' : 'Create Task'}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
      </div>
    </form>
  );
};
