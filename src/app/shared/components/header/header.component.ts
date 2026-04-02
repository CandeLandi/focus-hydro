import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HydroFocusDailyService } from '../../../core/services/hydrofocus-daily.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private daily = inject(HydroFocusDailyService);

  sessionNumber = computed(() => this.daily.completedSessions() + 1);
  focusMinutes = this.daily.totalFocusMinutes;
  focusTimeLabel = computed(() => this.formatFocus(this.focusMinutes()));

  private formatFocus(minutes: number): string {
    if (minutes === 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}
