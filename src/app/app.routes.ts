import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    children: [
      { path: '', redirectTo: 'temporizador', pathMatch: 'full' },
      {
        path: 'temporizador',
        loadComponent: () => import('./features/timer/timer.component').then(m => m.TimerComponent)
      },
      {
        path: 'estadisticas',
        loadComponent: () => import('./features/stats/stats.component').then(m => m.StatsComponent)
      },
      {
        path: 'ajustes',
        loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent)
      }
    ]
  }
];
