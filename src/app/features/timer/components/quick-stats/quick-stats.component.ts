import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface QuickStats {
  completedToday: number;
  totalFocusTime: string;
  progress: number;
}

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-stats.component.html',
  styles: []
})
export class QuickStatsComponent {
  @Input() stats: QuickStats = {
    completedToday: 0,
    totalFocusTime: '0h',
    progress: 0
  };
}
