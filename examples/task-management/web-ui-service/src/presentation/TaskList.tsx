/**
 * TaskList Component
 * Presentation Layer - Displays list of tasks
 */

import React, { useEffect, useState } from 'react';
import { Task, TaskStatus } from '../data/types.js';
import { TaskStore } from '../business/task-store.js';

interface TaskListProps {
  taskStore: TaskStore;
  onTaskClick: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const TaskList: React.FC<TaskListProps> = ({ taskStore, onTaskClick, onDeleteTask }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Subscribe to task store updates
    const unsubscribe = taskStore.subscribe((updatedTasks) => {
      setTasks(updatedTasks);
      setLoading(taskStore.isLoading());
    });

    // Load initial tasks
    taskStore.loadTasks(filter);

    return unsubscribe;
  }, [taskStore, filter]);

  const handleFilterChange = (status: TaskStatus | undefined) => {
    setFilter(status);
    taskStore.loadTasks(status);
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return '#ff4444';
      case 'medium': return '#ffaa00';
      case 'low': return '#44ff44';
      default: return '#888888';
    }
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="task-list">
      <div className="filters">
        <button onClick={() => handleFilterChange(undefined)}>All</button>
        <button onClick={() => handleFilterChange(TaskStatus.TODO)}>To Do</button>
        <button onClick={() => handleFilterChange(TaskStatus.IN_PROGRESS)}>In Progress</button>
        <button onClick={() => handleFilterChange(TaskStatus.DONE)}>Done</button>
      </div>

      <div className="tasks">
        {tasks.length === 0 ? (
          <p>No tasks found</p>
        ) : (
          tasks.map(task => (
            <div key={task.id} className="task-card" onClick={() => onTaskClick(task)}>
              <div className="task-header">
                <h3>{task.title}</h3>
                <span
                  className="priority-badge"
                  style={{ backgroundColor: getPriorityColor(task.priority) }}
                >
                  {task.priority}
                </span>
              </div>
              <p>{task.description}</p>
              <div className="task-footer">
                <span className="status">{task.status}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteTask(task.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
