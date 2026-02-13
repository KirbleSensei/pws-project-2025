import { Route } from '@angular/router';
import { HomePage } from './pages/home/home';
import { PersonsPage } from './pages/persons/persons';
import { TeamsPage } from './pages/teams/teams';
import { TasksPage } from './pages/tasks/tasks';
import { AdminChangesPage } from './pages/admin-changes/admin-changes';
import { AdminUsersPage } from './pages/admin-users/admin-users';

export interface AppRoute extends Route {
  icon?: string;
  roles?: number[];
}

export const routes: AppRoute[] = [
  { path: '', component: HomePage, title: 'Home', icon: 'home' },
  { path: 'persons', component: PersonsPage, title: 'Persons', icon: 'person', roles: [0,1] },
  { path: 'teams', component: TeamsPage, title: 'Teams', icon: 'groups', roles: [0,1] },
  { path: 'tasks', component: TasksPage, title: 'Tasks', icon: 'task', roles: [0,1] },
  { path: 'changes', component: AdminChangesPage, title: 'Changes', icon: 'history', roles: [0] },
  { path: 'sessions', component: AdminUsersPage, title: 'Sessions', icon: 'admin_panel_settings', roles: [0] }
];

