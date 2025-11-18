import { Component, signal, computed, effect, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { WaterBottleComponent } from './components/water-bottle/water-bottle.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

export interface TimerConfig {
  focusDuration: number;      // minutos
  breakDuration: number;      // minutos
  longBreakDuration: number;  // minutos
  sessionsUntilLongBreak: number;
}

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, WaterBottleComponent, TaskListComponent, DialogModule, ButtonModule],
  templateUrl: './timer.component.html',
  styles: []
})
export class TimerComponent implements OnDestroy, OnInit {
  // Signals para el estado del temporizador
  timeRemaining = signal<number>(1500); // 25 minutos en segundos
  isRunning = signal<boolean>(false);
  currentMode = signal<'focus' | 'break'>('focus');
  sessionsCompleted = signal<number>(0);

  // Configuración del timer
  timerConfig = signal<TimerConfig>({
    focusDuration: 25,
    breakDuration: 5,
    longBreakDuration: 15,
    sessionsUntilLongBreak: 4
  });

  // Variables para el intervalo
  private intervalId: number | null = null;
  private readonly TIMER_STATE_KEY = 'hydrofocus-timer-state';

  // Computed properties
  timerProgress = computed(() => {
    const config = this.timerConfig();
    const total = this.currentMode() === 'focus'
      ? config.focusDuration * 60
      : config.breakDuration * 60;
    return ((total - this.timeRemaining()) / total) * 100;
  });

  isBreak = computed(() => this.currentMode() === 'break');

  skipActionIcon = computed(() => this.currentMode() === 'focus' ? 'pi pi-moon' : 'pi pi-bolt');

  sessionIntroVisible = signal(false);

  constructor() {
    // Effect para manejar el estado del timer
    effect(() => {
      if (this.isRunning()) {
        this.startInterval();
      } else {
        this.stopInterval();
      }
    });

    // Effect para guardar el estado del timer automáticamente
    effect(() => {
      const state = {
        timeRemaining: this.timeRemaining(),
        isRunning: this.isRunning(),
        currentMode: this.currentMode(),
        sessionsCompleted: this.sessionsCompleted(),
        lastUpdate: Date.now()
      };
      this.saveTimerState(state);
    });
  }

  ngOnInit(): void {
    this.loadTimerConfig();
    this.loadTimerState();
  }

  private loadTimerConfig(): void {
    const savedConfig = localStorage.getItem('hydrofocus-timer-config');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        this.timerConfig.set(config);
      } catch (error) {
        console.error('Error loading timer config:', error);
      }
    }
  }

  private loadTimerState(): void {
    try {
      const savedState = localStorage.getItem(this.TIMER_STATE_KEY);
      if (savedState) {
        const state = JSON.parse(savedState);

        // Calcular el tiempo que ha pasado desde la última actualización
        const now = Date.now();
        const elapsed = Math.floor((now - state.lastUpdate) / 1000);

        // Restaurar el estado
        this.currentMode.set(state.currentMode);
        this.sessionsCompleted.set(state.sessionsCompleted);

        // Si el timer estaba corriendo, ajustar el tiempo
        if (state.isRunning && elapsed > 0) {
          const adjustedTime = Math.max(0, state.timeRemaining - elapsed);
          this.timeRemaining.set(adjustedTime);

          // Si el tiempo se agotó mientras estabas fuera, completar el timer
          if (adjustedTime === 0) {
            this.onTimerComplete();
          } else {
            // Continuar el timer automáticamente
            this.isRunning.set(true);
          }
        } else {
          this.timeRemaining.set(state.timeRemaining);
        }
      } else {
        // Si no hay estado guardado, usar la configuración por defecto
        const config = this.timerConfig();
        this.timeRemaining.set(config.focusDuration * 60);
      }
    } catch (error) {
      console.error('Error loading timer state:', error);
      const config = this.timerConfig();
      this.timeRemaining.set(config.focusDuration * 60);
    }
  }

  private saveTimerState(state: any): void {
    try {
      localStorage.setItem(this.TIMER_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  }

  ngOnDestroy(): void {
    this.stopInterval();
  }

  private startInterval(): void {
    this.stopInterval(); // Asegurar que no hay intervalos duplicados
    this.intervalId = window.setInterval(() => {
      const currentTime = this.timeRemaining();
      if (currentTime > 0) {
        this.timeRemaining.set(currentTime - 1);
      } else {
        this.onTimerComplete();
      }
    }, 1000);
  }

  private stopInterval(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private onTimerComplete(): void {
    this.stopInterval();
    this.isRunning.set(false);

    const config = this.timerConfig();

    if (this.currentMode() === 'focus') {
      // Completar sesión de enfoque
      this.sessionsCompleted.update(count => count + 1);
      // Cambiar a break
      this.currentMode.set('break');
      this.timeRemaining.set(config.breakDuration * 60);
    } else {
      // Completar break, volver a focus
      this.currentMode.set('focus');
      this.timeRemaining.set(config.focusDuration * 60);
    }
  }

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  startTimer(): void {
    this.sessionIntroVisible.set(true);
    this.isRunning.set(true);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
  }

  toggleTimer(): void {
    if (this.isRunning()) {
      this.pauseTimer();
    } else {
      this.startTimer();
    }
  }

  closeSessionIntro(): void {
    this.sessionIntroVisible.set(false);
  }

  resetTimer(): void {
    this.isRunning.set(false);
    const config = this.timerConfig();
    this.timeRemaining.set(this.currentMode() === 'focus'
      ? config.focusDuration * 60
      : config.breakDuration * 60);
  }

  skipToBreak(): void {
    const config = this.timerConfig();

    if (this.currentMode() === 'focus') {
      // Cambiar manualmente al modo descanso
      this.isRunning.set(false);
      this.currentMode.set('break');
      this.timeRemaining.set(config.breakDuration * 60);
    } else {
      // Volver al modo de enfoque
      this.isRunning.set(false);
      this.currentMode.set('focus');
      this.timeRemaining.set(config.focusDuration * 60);
    }
  }
}
