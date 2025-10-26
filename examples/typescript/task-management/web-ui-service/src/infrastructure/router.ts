/**
 * Application Router
 * Infrastructure Layer - Handles client-side routing
 */

export enum Route {
  HOME = '/',
  TASKS = '/tasks',
  TASK_DETAIL = '/tasks/:id',
  CREATE_TASK = '/tasks/new',
  LOGIN = '/login'
}

export class Router {
  private currentRoute: string = Route.HOME;
  private listeners: Array<(route: string) => void> = [];

  navigate(route: string): void {
    this.currentRoute = route;
    window.history.pushState({}, '', route);
    this.notifyListeners();
  }

  back(): void {
    window.history.back();
  }

  onRouteChange(listener: (route: string) => void): void {
    this.listeners.push(listener);
  }

  getCurrentRoute(): string {
    return this.currentRoute;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentRoute));
  }
}

export const createRouter = (): Router => {
  return new Router();
};
