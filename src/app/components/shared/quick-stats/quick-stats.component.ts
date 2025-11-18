import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface StatCard {
  value: string | number;
  label: string;
  color: 'blue' | 'green' | 'cyan' | 'purple';
  icon?: string;
}

@Component({
  selector: 'app-quick-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './quick-stats.component.html',
  styles: []
})
export class QuickStatsComponent {
  @Input() stats: StatCard[] = [];

  getColorClasses(color: string): string {
    const colorMap: { [key: string]: string } = {
      blue: 'text-blue-400',
      green: 'text-green-400',
      cyan: 'text-cyan-400',
      purple: 'text-purple-400'
    };
    return colorMap[color] || 'text-slate-400';
  }
}
