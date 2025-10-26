/**
 * App Component - Main application component
 * Presentation Layer - Root component that wires everything together
 */

import React, { useState } from 'react';
import { Dashboard } from './Dashboard.js';
import { TaskList } from './TaskList.js';
import { TaskForm } from './TaskForm.js';
import { TaskStore } from '../business/task-store.js';
import { FormValidator } from '../business/form-validator.js';
import { Task, CreateTaskDTO } from '../data/types.js';

interface AppProps {
  taskStore: TaskStore;
  formValidator: FormValidator;
}

type View = 'dashboard' | 'tasks' | 'create-task';

export const App: React.FC<AppProps> = ({ taskStore, formValidator }) => {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
  };

  const handleDeleteTask = async (id: string) => {
    if (confirm('Are you sure you want to delete this task?')) {
      await taskStore.deleteTask(id);
    }
  };

  const handleCreateTask = async (data: CreateTaskDTO) => {
    const task = await taskStore.createTask(data);
    if (task) {
      setCurrentView('tasks');
    }
  };

  return (
    <div className="app">
      <nav className="navbar">
        <h1>Task Management</h1>
        <div className="nav-links">
          <button
            className={currentView === 'dashboard' ? 'active' : ''}
            onClick={() => setCurrentView('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={currentView === 'tasks' ? 'active' : ''}
            onClick={() => setCurrentView('tasks')}
          >
            Tasks
          </button>
          <button
            className={currentView === 'create-task' ? 'active' : ''}
            onClick={() => setCurrentView('create-task')}
          >
            Create Task
          </button>
        </div>
      </nav>

      <main className="main-content">
        {currentView === 'dashboard' && <Dashboard taskStore={taskStore} />}

        {currentView === 'tasks' && (
          <TaskList
            taskStore={taskStore}
            onTaskClick={handleTaskClick}
            onDeleteTask={handleDeleteTask}
          />
        )}

        {currentView === 'create-task' && (
          <TaskForm
            validator={formValidator}
            onSubmit={handleCreateTask}
            onCancel={() => setCurrentView('tasks')}
          />
        )}
      </main>
    </div>
  );
};
