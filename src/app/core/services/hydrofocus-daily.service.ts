import { Injectable, signal, computed } from '@angular/core';
import { HydroTask, DailyState, getTodayDateKey } from '../../shared/models/daily.model';

const STORAGE_KEY = 'hydrofocus-daily';
const TIMER_CONFIG_KEY = 'hydrofocus-timer-config';
const DEFAULT_FOCUS_MINUTES = 25;

@Injectable({ providedIn: 'root' })
export class HydroFocusDailyService {
  private state = signal<DailyState>(this.getInitialState());

  tasks = computed(() => this.state().tasks);
  completedSessions = computed(() => this.state().completedSessions);
  totalFocusMinutes = computed(() => this.state().totalFocusMinutes);
  summaryGenerated = computed(() => this.state().summaryGenerated);
  dateKey = computed(() => this.state().dateKey);

  constructor() {
    this.loadAndMaybeResetDay();
  }

  private getInitialState(): DailyState {
    return {
      dateKey: getTodayDateKey(),
      tasks: [],
      completedSessions: 0,
      totalFocusMinutes: 0,
      summaryGenerated: false
    };
  }

  /** Carga desde localStorage; si el día cambió, resetea y persiste. */
  loadAndMaybeResetDay(): void {
    const today = getTodayDateKey();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.state.set(this.getInitialState());
        this.persist();
        return;
      }
      const parsed: DailyState = JSON.parse(raw);
      if (parsed.dateKey !== today) {
        this.state.set(this.getInitialState());
        this.persist();
        return;
      }
      this.correctFocusMinutesIfNeeded(parsed);
      this.state.set(parsed);
      this.persist();
    } catch {
      this.state.set(this.getInitialState());
      this.persist();
    }
  }

  /**
   * Corrige totalFocusMinutes si viene de cuando el timer estaba en 1 min (dato legacy).
   * - Usa la duración de enfoque configurada (si existe) para estimar mínimos esperados.
   */
  private correctFocusMinutesIfNeeded(parsed: DailyState): void {
    const block = this.getConfiguredFocusMinutes();
    const minExpected = parsed.completedSessions * block;
    if (parsed.totalFocusMinutes < minExpected) {
      parsed.totalFocusMinutes = minExpected;
    }
    if (parsed.totalFocusMinutes > 0 && parsed.totalFocusMinutes < block) {
      parsed.totalFocusMinutes = parsed.completedSessions > 0 ? parsed.completedSessions * block : block;
    }
    if (block > 0) {
      const impliedSessions = Math.floor(parsed.totalFocusMinutes / block);
      if (parsed.completedSessions === 0 && impliedSessions > 0) {
        parsed.completedSessions = impliedSessions;
      }
    }
  }

  private getConfiguredFocusMinutes(): number {
    try {
      const raw = localStorage.getItem(TIMER_CONFIG_KEY);
      if (!raw) return DEFAULT_FOCUS_MINUTES;
      const parsed = JSON.parse(raw) as { focusDuration?: unknown };
      const value = Number(parsed?.focusDuration);
      if (!Number.isFinite(value) || !Number.isInteger(value) || value < 1 || value > 180) {
        return DEFAULT_FOCUS_MINUTES;
      }
      return value;
    } catch {
      return DEFAULT_FOCUS_MINUTES;
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state()));
    } catch (e) {
      console.error('[Focus and Hydrate] Error persisting daily state', e);
    }
  }

  setTasks(tasks: HydroTask[]): void {
    this.state.update(s => ({ ...s, tasks }));
    this.persist();
  }

  addTask(task: HydroTask): void {
    this.state.update(s => ({ ...s, tasks: [...s.tasks, task] }));
    this.persist();
  }

  updateTask(id: string, patch: Partial<HydroTask>): void {
    this.state.update(s => ({
      ...s,
      tasks: s.tasks.map(t => t.id === id ? { ...t, ...patch } : t)
    }));
    this.persist();
  }

  removeTask(id: string): void {
    this.state.update(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
    this.persist();
  }

  setCompletedSessions(count: number): void {
    this.state.update(s => ({ ...s, completedSessions: count }));
    this.persist();
  }

  setTotalFocusMinutes(minutes: number): void {
    this.state.update(s => ({ ...s, totalFocusMinutes: minutes }));
    this.persist();
  }

  /** Suma minutos de enfoque del bloque configurado. */
  addFocusMinutes(minutes: number): void {
    this.state.update(s => ({ ...s, totalFocusMinutes: s.totalFocusMinutes + minutes }));
    this.persist();
  }

  /** Una sesión = un bloque de enfoque completado (el descanso es opcional / se puede saltear). */
  incrementCompletedSession(): void {
    this.state.update(s => ({ ...s, completedSessions: s.completedSessions + 1 }));
    this.persist();
  }

  setSummaryGenerated(value: boolean): void {
    this.state.update(s => ({ ...s, summaryGenerated: value }));
    this.persist();
  }

  /** Cierra el día: resetea tareas y métricas, nuevo dateKey. */
  resetDay(): void {
    this.state.set(this.getInitialState());
    this.persist();
  }
}
