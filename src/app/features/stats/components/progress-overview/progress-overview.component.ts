import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ProgressData {
  totalSessions: number;
  totalFocusTime: string;
  currentStreak: number;
  completedTasks: number;
  perfectDays: number;
  bestStreak: number;
  weeklyAverage: string;
  productivityIndex: number;
}

@Component({
  selector: 'app-progress-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-overview.component.html',
  styles: []
})
export class ProgressOverviewComponent {
  @Input() progressData: ProgressData = {
    totalSessions: 0,
    totalFocusTime: '0h 0m',
    currentStreak: 0,
    completedTasks: 0,
    perfectDays: 0,
    bestStreak: 0,
    weeklyAverage: '0 tareas/día',
    productivityIndex: 0
  };
}
