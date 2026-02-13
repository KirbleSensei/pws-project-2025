import { Route } from '@angular/router';
import { HomePage } from './pages/home/home';
import { PersonsPage } from './pages/persons/persons';
import { TeamsPage } from './pages/teams/teams';
import { TasksPage } from './pages/tasks/tasks';

export interface AppRoute extends Route {
  icon?: string;
  roles?: number[];
}

export const routes: AppRoute[] = [
  { path: '', component: HomePage, title: 'Home', icon: 'home' },
  { path: 'persons', component: PersonsPage, title: 'Persons', icon: 'person', roles: [0,1] },
  { path: 'teams', component: TeamsPage, title: 'Teams', icon: 'groups', roles: [0,1] },
  { path: 'tasks', component: TasksPage, title: 'Tasks', icon: 'task', roles: [0,1] }
];

