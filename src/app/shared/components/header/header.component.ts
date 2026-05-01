import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HydroFocusDailyService } from '../../../core/services/hydrofocus-daily.service';
import { AmbientSoundService } from '../../../core/services/ambient-sound.service';
import { TranslateModule } from '@ngx-translate/core';
import { LanguageService, AppLanguage } from '../../../core/i18n/language.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  private daily = inject(HydroFocusDailyService);
  private languageService = inject(LanguageService);
  readonly ambient = inject(AmbientSoundService);

  sessionNumber = computed(() => this.daily.completedSessions() + 1);
  focusMinutes = this.daily.totalFocusMinutes;
  focusTimeLabel = computed(() => this.formatFocus(this.focusMinutes()));
  currentLanguage = this.languageService.currentLanguage;

  private formatFocus(minutes: number): string {
    if (minutes === 0) return '0 min';
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }

  setLanguage(language: AppLanguage): void {
    this.languageService.setLanguage(language, true);
  }
}
