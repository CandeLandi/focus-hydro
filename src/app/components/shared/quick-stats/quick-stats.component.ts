import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

export interface StatCard {
  value: string | number;
  label: string;
  color: 'blue' | 'green' | 'cyan' | 'purple';
  icon?: string;
}

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './quick-stats.component.html',
  styleUrl: './quick-stats.component.css'
})
export class QuickStatsComponent {
  @Input() stats: StatCard[] = [];

  isHighlight(stat: StatCard): boolean {
    return stat.color === 'green';
  }
}
