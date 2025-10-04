import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface UserPreferences {
  autoStartBreaks: boolean;
  autoStartSessions: boolean;
  notificationsEnabled: boolean;
  darkMode: boolean;
  defaultMusic: string;
  volume: number;
  soundEnabled: boolean;
}

@Component({
  selector: 'app-preferences',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './preferences.component.html',
  styles: []
})
export class PreferencesComponent {
  @Input() preferences: UserPreferences = {
    autoStartBreaks: false,
    autoStartSessions: false,
    notificationsEnabled: true,
    darkMode: true,
    defaultMusic: 'lofi',
    volume: 50,
    soundEnabled: true
  };

  @Output() preferencesChange = new EventEmitter<UserPreferences>();

  onPreferencesChange(): void {
    this.preferencesChange.emit(this.preferences);
  }
}
