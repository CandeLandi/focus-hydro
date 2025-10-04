import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProgressOverviewComponent, Achievements } from './components/progress-overview/progress-overview.component';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, ProgressOverviewComponent],
  templateUrl: './stats.component.html',
  styles: []
})
export class StatsComponent {
  // Datos de ejemplo - en una app real vendrían de un servicio
  achievements = signal<Achievements>({
    totalSessions: 25,
    totalMinutes: 1250, // 20 horas y 50 minutos
    currentStreak: 7,
    totalTasksCompleted: 18,
    perfectDays: 3,
    bestStreak: 12,
    weeklyAverage: '2.5 tareas/día',
    productivityScore: 85
  });
}
