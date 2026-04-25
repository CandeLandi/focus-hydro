import { Component, computed, effect, output, signal, inject, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { QuickStatsComponent, StatCard } from '../../../../components/shared/quick-stats/quick-stats.component';
import { CelebrationStats } from '../../../../shared/models/celebration.model';
import { HydroFocusDailyService } from '../../../../core/services/hydrofocus-daily.service';
import { HydroTask } from '../../../../shared/models/daily.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../../../core/i18n/language.service';

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, InputTextModule, CheckboxModule, ButtonModule, QuickStatsComponent],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.css',
  host: { class: 'block h-full' }
})
export class TaskListComponent {
  private dailyService = inject(HydroFocusDailyService);
  private destroyRef = inject(DestroyRef);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  tasks = this.dailyService.tasks;
  completedSessions = this.dailyService.completedSessions;
  totalFocusMinutes = this.dailyService.totalFocusMinutes;

  newTask = '';
  celebrationReached = output<CelebrationStats>();
  shareSummaryRequest = output<CelebrationStats>();
  /** Primera pulsación: muestra ✓ en el botón; segunda: elimina. */
  pendingDeleteTaskId = signal<string | null>(null);

  private hasTriggeredCelebration = false;
  private pendingDeleteClearTimer: ReturnType<typeof setTimeout> | null = null;

  completedCount = computed(() => this.tasks().filter(t => t.completed).length);
  today = computed(() => {
    const locale = this.language.currentLanguage() === 'en' ? 'en-US' : 'es-ES';
    return new Date().toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  });
  completionPercentage = computed(() => {
    const total = this.tasks().length;
    return total > 0 ? Math.round((this.completedCount() / total) * 100) : 0;
  });
  allTasksCompleted = computed(() => {
    const all = this.tasks();
    return all.length > 0 && all.every(t => t.completed);
  });

  pendingTasks = computed(() => this.tasks().filter(t => !t.completed));
  doneTasks = computed(() => this.tasks().filter(t => t.completed));

  stats = computed<StatCard[]>(() => {
    this.language.currentLanguage();
    this.language.translationTick();
    return [
      {
        value: this.completedSessions().toString(),
        label: this.translate.instant('stats.sessions'),
        color: 'blue'
      },
      {
        value: this.formatFocusTime(this.totalFocusMinutes()),
        label: this.translate.instant('stats.focusMin'),
        color: 'green'
      },
      {
        value: `${this.completionPercentage()}%`,
        label: this.translate.instant('stats.tasks'),
        color: 'cyan'
      }
    ];
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.clearPendingDeleteTimer());

    effect(() => {
      const allCompleted = this.allTasksCompleted();
      const totalTasks = this.tasks().length;
      const focusMin = this.totalFocusMinutes();
      const summaryAlreadyGenerated = this.dailyService.summaryGenerated();

      if (allCompleted && totalTasks > 0 && !this.hasTriggeredCelebration && !summaryAlreadyGenerated) {
        this.hasTriggeredCelebration = true;
        this.dailyService.setSummaryGenerated(true);
        this.celebrationReached.emit({
          tasksCompleted: totalTasks,
          totalFocusTime: this.formatFocusTime(focusMin),
          completionPercentage: 100,
          date: new Date()
        });
      } else if (!allCompleted && totalTasks > 0) {
        this.hasTriggeredCelebration = false;
        if (summaryAlreadyGenerated) {
          this.dailyService.setSummaryGenerated(false);
        }
      }
    });

    effect(
      () => {
        this.tasks();
        if (this.pendingDeleteTaskId() !== null) {
          const ids = new Set(this.tasks().map(t => t.id));
          if (!ids.has(this.pendingDeleteTaskId()!)) {
            this.clearPendingDeleteState();
          }
        }
      },
      { allowSignalWrites: true }
    );
  }

  addTask(): void {
    const text = this.newTask.trim();
    if (!text) return;
    const task: HydroTask = {
      id: Date.now().toString(),
      text,
      completed: false,
      createdAt: Date.now()
    };
    this.dailyService.addTask(task);
    this.newTask = '';
  }

  toggleTaskCompletion(taskId: string, completed: boolean): void {
    this.dailyService.updateTask(taskId, {
      completed,
      completedAt: completed ? Date.now() : undefined
    });
  }

  onDeleteButtonClick(task: HydroTask, event: MouseEvent): void {
    event.stopPropagation();
    if (this.pendingDeleteTaskId() === task.id) {
      this.dailyService.removeTask(task.id);
      this.clearPendingDeleteState();
      return;
    }
    this.clearPendingDeleteTimer();
    this.pendingDeleteTaskId.set(task.id);
    this.pendingDeleteClearTimer = setTimeout(() => {
      this.pendingDeleteTaskId.set(null);
      this.pendingDeleteClearTimer = null;
    }, 4500);
  }

  private clearPendingDeleteTimer(): void {
    if (this.pendingDeleteClearTimer !== null) {
      clearTimeout(this.pendingDeleteClearTimer);
      this.pendingDeleteClearTimer = null;
    }
  }

  private clearPendingDeleteState(): void {
    this.clearPendingDeleteTimer();
    this.pendingDeleteTaskId.set(null);
  }

  onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') this.addTask();
  }

  private formatFocusTime(minutes: number): string {
    if (minutes === 0) return '0m';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}m`;
    if (h > 0) return `${h}h`;
    return `${m}m`;
  }

  resetCelebrationFlag(): void {
    this.hasTriggeredCelebration = false;
  }

  emitShareSummary(): void {
    if (!this.allTasksCompleted() || this.tasks().length === 0) return;
    this.shareSummaryRequest.emit({
      tasksCompleted: this.tasks().length,
      totalFocusTime: this.formatFocusTime(this.totalFocusMinutes()),
      completionPercentage: 100,
      date: new Date()
    });
  }
}
