import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { FlowRoute } from './flow-meta';

// `data.flow` is the single source of truth for the user-flow graph AND the runtime navbar.
// The colossus flow-graph extractor projects it directly (zero heuristics).
//
// DEEP-LINKABLE STATE — every navigable UI state a user could leave feedback on must be
// reachable by URL (so automated verification can land on it). Patterns:
//   • modal / dialog → `?modal=<name>[&id=]` read on init
//   • drawer / detail pane → `?panel=<id>`
//   • filtered / sorted list → bind the filter to query params (queryParamsHandling:'merge')
// Never bury a navigable state in component-only state. Transient chrome (tooltip/hover) is exempt.
export const routes: Routes = ([
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
    data: { flow: { flowId: 'login', node: 'login', entry: true, edgesTo: ['dashboard', 'signup'], label: 'Login' } },
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/signup/signup.component').then((m) => m.SignupComponent),
    data: { flow: { flowId: 'signup', node: 'signup', entry: true, edgesTo: ['dashboard', 'login'], label: 'Sign up' } },
  },
  {
    path: '',
    loadComponent: () =>
      import('./layout/shell/shell.component').then((m) => m.ShellComponent),
    canActivate: [authGuard],
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
        data: { flow: { flowId: 'dashboard', node: 'dashboard', showInNavbar: true, label: 'Dashboard', scope: 'all', edgesTo: ['loans', 'tools'] } },
      },
      {
        path: 'tools',
        loadComponent: () =>
          import('./features/tools/tools.component').then((m) => m.ToolsComponent),
        data: { flow: { flowId: 'tools', node: 'tools', showInNavbar: true, label: 'Tools', scope: 'all', edgesTo: ['reservations', 'loans'] } },
      },
      {
        path: 'loans',
        loadComponent: () =>
          import('./features/loans/loans.component').then((m) => m.LoansComponent),
        data: { flow: { flowId: 'loans', node: 'loans', showInNavbar: true, label: 'Loans', scope: 'all', edgesTo: ['dashboard'] } },
      },
      {
        path: 'reservations',
        loadComponent: () =>
          import('./features/reservations/reservations.component').then((m) => m.ReservationsComponent),
        data: { flow: { flowId: 'reservations', node: 'reservations', showInNavbar: true, label: 'Reservations', scope: 'all', edgesTo: ['tools'] } },
      },
      {
        path: 'admin/settings',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./features/admin-settings/admin-settings.component').then((m) => m.AdminSettingsComponent),
        data: { flow: { flowId: 'admin-settings', node: 'admin-settings', showInNavbar: true, label: 'Settings', scope: 'admin' } },
      },
    ],
  },
  { path: '**', redirectTo: 'login' },
] satisfies FlowRoute[]) as Routes;
