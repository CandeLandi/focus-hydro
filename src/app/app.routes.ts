import { Routes } from '@angular/router';
import { localeRouteGuard } from './core/i18n/locale-route.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'es',
    pathMatch: 'full'
  },
  {
    path: ':lang',
    canActivate: [localeRouteGuard],
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: '**',
    redirectTo: 'es'
  }
];
