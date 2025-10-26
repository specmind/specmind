/**
 * Web UI Entry Point
 * Initializes all layers and renders the React application
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './presentation/App.js';
import { createHttpClient } from './infrastructure/http-client.js';
import { createLocalStorage } from './infrastructure/local-storage.js';
import { ApiClient } from './data/api-client.js';
import { CacheManager } from './data/cache-manager.js';
import { TaskStore } from './business/task-store.js';
import { FormValidator } from './business/form-validator.js';

// Initialize Infrastructure Layer
const httpClient = createHttpClient({
  baseUrl: 'http://localhost:3000',
  timeout: 10000
});

const localStorage = createLocalStorage('task-mgmt');

// Set auth token (in real app, this would come from login)
httpClient.setAuthToken('Bearer demo_token');

// Initialize Data Layer
const apiClient = new ApiClient(httpClient);
const cacheManager = new CacheManager(localStorage);

// Initialize Business Layer
const taskStore = new TaskStore(apiClient, cacheManager);
const formValidator = new FormValidator();

// Render Application
const root = document.getElementById('root');
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App taskStore={taskStore} formValidator={formValidator} />
    </React.StrictMode>
  );
}
