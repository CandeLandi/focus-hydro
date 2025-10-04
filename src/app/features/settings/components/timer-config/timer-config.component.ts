import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface TimerConfig {
  focusDuration: number;      // minutos
  breakDuration: number;      // minutos
  longBreakDuration: number;  // minutos
  sessionsUntilLongBreak: number;
}

@Component({
  selector: 'app-timer-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './timer-config.component.html',
  styles: []
})
export class TimerConfigComponent {
  @Input() config: TimerConfig = {
    focusDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4
  };

  @Output() configChange = new EventEmitter<TimerConfig>();

  onConfigChange(): void {
    this.configChange.emit(this.config);
  }
}
