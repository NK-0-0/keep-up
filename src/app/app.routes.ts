import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    title: 'KeepUp — Your modules',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'sign-in',
    title: 'Sign in to KeepUp',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/sign-in.page').then((m) => m.SignInPage),
  },
  { path: '**', redirectTo: '' },
];
