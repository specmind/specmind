/**
 * Local Storage Manager
 * Infrastructure Layer - Handles browser local storage operations
 */

export class LocalStorageManager {
  private prefix: string;

  constructor(prefix: string = 'task-mgmt') {
    this.prefix = prefix;
  }

  set<T>(key: string, value: T): void {
    const fullKey = `${this.prefix}:${key}`;
    localStorage.setItem(fullKey, JSON.stringify(value));
  }

  get<T>(key: string): T | null {
    const fullKey = `${this.prefix}:${key}`;
    const item = localStorage.getItem(fullKey);

    if (!item) {
      return null;
    }

    try {
      return JSON.parse(item) as T;
    } catch {
      return null;
    }
  }

  remove(key: string): void {
    const fullKey = `${this.prefix}:${key}`;
    localStorage.removeItem(fullKey);
  }

  clear(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(`${this.prefix}:`)) {
        localStorage.removeItem(key);
      }
    });
  }
}

export const createLocalStorage = (prefix?: string): LocalStorageManager => {
  return new LocalStorageManager(prefix);
};
