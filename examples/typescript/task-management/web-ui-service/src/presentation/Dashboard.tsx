/**
 * Dashboard Component
 * Presentation Layer - Main dashboard view with statistics
 */

import React, { useEffect, useState } from 'react';
import { Task, TaskStatus } from '../data/types.js';
import { TaskStore } from '../business/task-store.js';

interface DashboardProps {
  taskStore: TaskStore;
}

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  done: number;
}

export const Dashboard: React.FC<DashboardProps> = ({ taskStore }) => {
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    done: 0
  });

  useEffect(() => {
    const unsubscribe = taskStore.subscribe((tasks) => {
      calculateStats(tasks);
    });

    taskStore.loadTasks();

    return unsubscribe;
  }, [taskStore]);

  const calculateStats = (tasks: Task[]) => {
    setStats({
      total: tasks.length,
      todo: tasks.filter(t => t.status === TaskStatus.TODO).length,
      inProgress: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      done: tasks.filter(t => t.status === TaskStatus.DONE).length
    });
  };

  return (
    <div className="dashboard">
      <h1>Task Management Dashboard</h1>

      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Tasks</h3>
          <p className="stat-number">{stats.total}</p>
        </div>

        <div className="stat-card todo">
          <h3>To Do</h3>
          <p className="stat-number">{stats.todo}</p>
        </div>

        <div className="stat-card in-progress">
          <h3>In Progress</h3>
          <p className="stat-number">{stats.inProgress}</p>
        </div>

        <div className="stat-card done">
          <h3>Done</h3>
          <p className="stat-number">{stats.done}</p>
        </div>
      </div>

      <div className="completion-rate">
        <h3>Completion Rate</h3>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: stats.total > 0 ? `${(stats.done / stats.total) * 100}%` : '0%'
            }}
          />
        </div>
        <p>
          {stats.total > 0
            ? `${Math.round((stats.done / stats.total) * 100)}%`
            : '0%'}
        </p>
      </div>
    </div>
  );
};
