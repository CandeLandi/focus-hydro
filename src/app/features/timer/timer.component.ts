import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WaterBottleComponent } from './components/water-bottle/water-bottle.component';
import { TaskListComponent } from './components/task-list/task-list.component';

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, WaterBottleComponent, TaskListComponent],
  templateUrl: './timer.component.html',
  styles: []
})
export class TimerComponent {
  // Signals para el estado del temporizador
  timeRemaining = signal<number>(1500); // 25 minutos en segundos
  isRunning = signal<boolean>(false);
  currentMode = signal<'focus' | 'break'>('focus');
  sessionsCompleted = signal<number>(0);

  // Exponer Math para el template
  Math = Math;

  // Computed properties
  timerProgress = computed(() => {
    const total = this.currentMode() === 'focus' ? 1500 : 300; // 25min focus, 5min break
    return ((total - this.timeRemaining()) / total) * 100;
  });

  isBreak = computed(() => this.currentMode() === 'break');

  // Estadísticas rápidas
  focusHours = computed(() => Math.round((this.sessionsCompleted() * 25) / 60));

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  startTimer(): void {
    this.isRunning.set(true);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
  }

  resetTimer(): void {
    this.isRunning.set(false);
    this.timeRemaining.set(this.currentMode() === 'focus' ? 1500 : 300);
  }
}
