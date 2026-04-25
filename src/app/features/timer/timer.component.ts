import { Component, signal, computed, effect, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WaterBottleComponent } from './components/water-bottle/water-bottle.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { CelebrationDialogComponent } from '../../components/celebration/celebration-dialog.component';
import { CelebrationStats } from '../../shared/models/celebration.model';
import { NotificationService } from '../../core/services/notification.service';
import { HydroFocusDailyService } from '../../core/services/hydrofocus-daily.service';
import { BrowserTabProgressService } from '../../core/services/browser-tab-progress.service';
import { TimerPersistedState } from '../../shared/models/timer-state.model';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../../core/i18n/language.service';

export interface TimerConfig {
  focusDuration: number;
  breakDuration: number;
  longBreakDuration: number;
  sessionsUntilLongBreak: number;
}

const TIMER_STATE_KEY = 'hydrofocus-timer-state';
const TIMER_CONFIG_KEY = 'hydrofocus-timer-config';
const SHARE_PROFILE_KEY = 'hydrofocus-share-profile';
const DEFAULT_TIMER_CONFIG: TimerConfig = {
  focusDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  sessionsUntilLongBreak: 4
};

interface ShareProfileState {
  displayName: string;
  dismissedFirstSessionPrompt: boolean;
}

@Component({
  selector: 'app-timer',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, WaterBottleComponent, TaskListComponent, DialogModule, ButtonModule, InputNumberModule, CelebrationDialogComponent],
  templateUrl: './timer.component.html',
  styleUrls: ['./timer.component.css']
})
export class TimerComponent implements OnDestroy, OnInit {
  @ViewChild(TaskListComponent) taskListComponent!: TaskListComponent;

  timeRemaining = signal<number>(1500);
  isRunning = signal<boolean>(false);
  currentMode = signal<'focus' | 'break'>('focus');
  /** Cuando arrancó el segmento actual (para recalcular al recargar). */
  private startedAt = signal<number | null>(null);

  timerConfig = signal<TimerConfig>(DEFAULT_TIMER_CONFIG);
  settingsVisible = signal(false);
  settingsFocusMinutes = signal(DEFAULT_TIMER_CONFIG.focusDuration);
  settingsBreakMinutes = signal(DEFAULT_TIMER_CONFIG.breakDuration);
  settingsError = signal<string | null>(null);
  shareNamePromptVisible = signal(false);
  shareNameInput = signal('');
  shareNameError = signal<string | null>(null);
  shareNamePromptContext = signal<'first-session' | 'share'>('first-session');
  shareDisplayName = signal('');
  dismissedFirstSessionPrompt = signal(false);
  private pendingShareStats = signal<CelebrationStats | null>(null);

  private intervalId: number | null = null;
  private didInitSessionWatcher = false;
  private previousCompletedSessions = 0;
  private wasRunningOnLastTick = false;
  private lastOneMinuteAlertSignature: string | null = null;

  private notificationService = inject(NotificationService);
  private dailyService = inject(HydroFocusDailyService);
  private browserTabProgress = inject(BrowserTabProgressService);
  private translate = inject(TranslateService);
  private language = inject(LanguageService);
  sessionsCompleted = computed(() => this.dailyService.completedSessions());
  totalFocusTimeMinutes = computed(() => this.dailyService.totalFocusMinutes());
  transitionTip = this.notificationService.transitionTip;

  private currentSegmentTotalSeconds = computed(() => {
    const config = this.timerConfig();
    if (this.currentMode() === 'focus') return config.focusDuration * 60;
    return this.isLongBreak() ? config.longBreakDuration * 60 : config.breakDuration * 60;
  });

  timerProgress = computed(() => {
    const total = this.currentSegmentTotalSeconds();
    return total > 0 ? ((total - this.timeRemaining()) / total) * 100 : 0;
  });

  isBreak = computed(() => this.currentMode() === 'break');
  isLongBreak = computed(() => {
    if (this.currentMode() !== 'break') return false;
    const config = this.timerConfig();
    const blocks = this.totalFocusTimeMinutes() / config.focusDuration;
    return blocks >= 1 && Math.floor(blocks) % config.sessionsUntilLongBreak === 0;
  });
  nextIsLongBreak = computed(() => {
    const config = this.timerConfig();
    const blocksAfterThis = this.totalFocusTimeMinutes() / config.focusDuration + 1;
    return Math.floor(blocksAfterThis) > 0 && Math.floor(blocksAfterThis) % config.sessionsUntilLongBreak === 0;
  });

  skipActionIcon = computed(() => this.currentMode() === 'focus' ? 'pi pi-moon' : 'pi pi-bolt');

  mainButtonLabel = computed(() => {
    this.language.currentLanguage();
    this.language.translationTick();
    const remaining = this.timeRemaining();
    const total = this.currentSegmentTotalSeconds();
    if (this.isRunning()) return this.t('timer.pause');
    return remaining < total && remaining > 0 ? this.t('timer.resume') : this.t('timer.start');
  });

  timerMicrocopy = computed(() => this.isBreak() ? this.breakMessage() : this.t('timer.oneThing'));

  breakMessage = computed(() => {
    this.language.currentLanguage();
    this.language.translationTick();
    const value = this.translate.instant('timer.breakMessages');
    const messages = Array.isArray(value) ? value as string[] : [this.t('timer.oneThing')];
    const idx = Math.abs(this.sessionsCompleted() + (this.isLongBreak() ? 1 : 0)) % messages.length;
    return messages[idx];
  });

  readonly dialogPosition = {
    intro: 'top' as const,
    center: 'center' as const
  };

  sessionIntroVisible = signal(false);
  hasShownFirstFocusIntro = signal(false);
  hasShownFirstBreakIntro = signal(false);
  skipConfirmVisible = signal(false);
  celebrationVisible = signal(false);
  celebrationStats = signal<CelebrationStats | null>(null);
  closeDayConfirmVisible = signal(false);

  constructor() {
    effect(() => {
      if (this.isRunning()) {
        this.startInterval();
      } else {
        this.stopInterval();
      }
    });

    effect(() => {
      this.language.translationTick();
      const running = this.isRunning();
      const mode = this.currentMode();
      const remaining = this.timeRemaining();
      const total = this.currentSegmentTotalSeconds();
      const dailySessions = this.sessionsCompleted();
      const isIdle = !running && remaining === total;

      this.browserTabProgress.update({
        mode: isIdle ? 'idle' : running ? mode : 'paused',
        remainingSeconds: remaining,
        totalSeconds: total,
        dailySessions,
        isRunning: running
      });

      if (!running && this.wasRunningOnLastTick && !isIdle) {
        this.browserTabProgress.showTemporaryTitle(
          `⏸ ${this.translate.instant('browserTab.paused')} • ${this.formatTime(remaining)}`,
          2500
        );
      }

      if (running && mode === 'focus' && remaining <= 60 && remaining > 0) {
        const signature = `${dailySessions}|${total}`;
        if (this.lastOneMinuteAlertSignature !== signature) {
          this.lastOneMinuteAlertSignature = signature;
          this.browserTabProgress.showTemporaryTitle(this.translate.instant('browserTab.lastMinuteFocus'), 3000);
        }
      }

      if (running && remaining > 60) {
        this.lastOneMinuteAlertSignature = null;
      }

      this.wasRunningOnLastTick = running;
    });

    effect(() => {
      const total = this.currentSegmentTotalSeconds();
      const state: TimerPersistedState = {
        mode: this.currentMode(),
        remainingSeconds: this.timeRemaining(),
        totalSeconds: total,
        startedAt: this.isRunning() ? this.startedAt() ?? Date.now() : null,
        isRunning: this.isRunning(),
        lastUpdatedAt: Date.now(),
        hasShownFirstFocusIntro: this.hasShownFirstFocusIntro(),
        hasShownFirstBreakIntro: this.hasShownFirstBreakIntro()
      };
      this.saveTimerState(state);
    });

    effect(
      () => {
        const completed = this.sessionsCompleted();
        if (!this.didInitSessionWatcher) {
          this.didInitSessionWatcher = true;
          this.previousCompletedSessions = completed;
          return;
        }
        const reachedFirstSession = this.previousCompletedSessions < 1 && completed >= 1;
        this.previousCompletedSessions = completed;
        if (reachedFirstSession && this.shouldAskForName('first-session')) {
          this.openShareNamePrompt('first-session');
        }
      },
      { allowSignalWrites: true }
    );
  }

  ngOnInit(): void {
    this.loadTimerConfig();
    this.loadShareProfile();
    this.loadTimerState();
  }

  private loadTimerConfig(): void {
    try {
      const raw = localStorage.getItem(TIMER_CONFIG_KEY);
      if (!raw) {
        this.timerConfig.set(DEFAULT_TIMER_CONFIG);
        return;
      }
      const parsed = JSON.parse(raw);
      this.timerConfig.set(this.sanitizeTimerConfig(parsed));
    } catch (e) {
      console.error('Error loading timer config', e);
      this.timerConfig.set(DEFAULT_TIMER_CONFIG);
    }
  }

  private sanitizeTimerConfig(value: unknown): TimerConfig {
    if (!value || typeof value !== 'object') return DEFAULT_TIMER_CONFIG;
    const raw = value as Partial<TimerConfig>;
    const focusDuration = this.safeMinutes(raw.focusDuration, DEFAULT_TIMER_CONFIG.focusDuration, 1, 180);
    const breakDuration = this.safeMinutes(raw.breakDuration, DEFAULT_TIMER_CONFIG.breakDuration, 1, 60);
    const longBreakDuration = this.safeMinutes(raw.longBreakDuration, DEFAULT_TIMER_CONFIG.longBreakDuration, 5, 90);
    const sessionsUntilLongBreak = this.safeMinutes(raw.sessionsUntilLongBreak, DEFAULT_TIMER_CONFIG.sessionsUntilLongBreak, 2, 10);
    return { focusDuration, breakDuration, longBreakDuration, sessionsUntilLongBreak };
  }

  private safeMinutes(value: unknown, fallback: number, min: number, max: number): number {
    const n = Number(value);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < min || n > max) return fallback;
    return n;
  }

  private saveTimerConfig(config: TimerConfig): void {
    try {
      localStorage.setItem(TIMER_CONFIG_KEY, JSON.stringify(config));
    } catch (e) {
      console.error('Error saving timer config', e);
    }
  }

  private loadShareProfile(): void {
    try {
      const raw = localStorage.getItem(SHARE_PROFILE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<ShareProfileState>;
      const displayName = this.normalizeDisplayName(parsed.displayName ?? '');
      const dismissed = Boolean(parsed.dismissedFirstSessionPrompt);
      this.shareDisplayName.set(displayName);
      this.dismissedFirstSessionPrompt.set(dismissed);
    } catch (e) {
      console.error('Error loading share profile', e);
      this.shareDisplayName.set('');
      this.dismissedFirstSessionPrompt.set(false);
    }
  }

  private saveShareProfile(): void {
    try {
      const payload: ShareProfileState = {
        displayName: this.shareDisplayName(),
        dismissedFirstSessionPrompt: this.dismissedFirstSessionPrompt()
      };
      localStorage.setItem(SHARE_PROFILE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.error('Error saving share profile', e);
    }
  }

  private normalizeDisplayName(value: string): string {
    return value.trim().replace(/\s+/g, ' ').slice(0, 40);
  }

  private shouldAskForName(context: 'first-session' | 'share'): boolean {
    const hasName = this.shareDisplayName().length > 0;
    if (hasName) return false;
    if (context === 'first-session') return !this.dismissedFirstSessionPrompt();
    return true;
  }

  private openShareNamePrompt(context: 'first-session' | 'share', pendingStats: CelebrationStats | null = null): void {
    this.shareNamePromptContext.set(context);
    this.shareNameInput.set(this.shareDisplayName());
    this.shareNameError.set(null);
    this.pendingShareStats.set(pendingStats);
    this.shareNamePromptVisible.set(true);
  }

  private enrichStatsWithName(stats: CelebrationStats): CelebrationStats {
    const name = this.shareDisplayName();
    if (!name) return stats;
    return { ...stats, displayName: name } as CelebrationStats;
  }

  /** Con 0 sesiones completadas hoy, no dejar el temporizador en descanso (restos de localStorage / otro día). */
  private ensureFirstDailySessionNotStuckInBreak(): void {
    if (this.dailyService.completedSessions() !== 0) return;
    if (this.currentMode() !== 'break') return;
    const config = this.timerConfig();
    this.currentMode.set('focus');
    this.timeRemaining.set(config.focusDuration * 60);
    this.startedAt.set(null);
    this.isRunning.set(false);
  }

  private loadTimerState(): void {
    this.dailyService.loadAndMaybeResetDay();

    try {
      const raw = localStorage.getItem(TIMER_STATE_KEY);
      const config = this.timerConfig();
      if (!raw) {
        this.currentMode.set('focus');
        this.timeRemaining.set(config.focusDuration * 60);
        this.isRunning.set(false);
        this.startedAt.set(null);
        return;
      }
      const state: TimerPersistedState = JSON.parse(raw);
      this.currentMode.set(state.mode);
      this.hasShownFirstFocusIntro.set(state.hasShownFirstFocusIntro ?? false);
      this.hasShownFirstBreakIntro.set(state.hasShownFirstBreakIntro ?? false);

      const totalFocus = config.focusDuration * 60;
      const totalBreak = config.breakDuration * 60;
      const totalLongBreak = config.longBreakDuration * 60;
      const totalBreakToUse = (state.totalSeconds ?? 0) >= totalLongBreak ? totalLongBreak : totalBreak;

      const totalToUse = state.mode === 'focus' ? totalFocus : totalBreakToUse;
      const wasShortConfig = state.mode === 'focus' && (state.totalSeconds ?? 0) < totalFocus
        || state.mode === 'break' && (state.totalSeconds ?? 0) < totalBreak;
      const effectiveTotal = wasShortConfig ? (state.mode === 'focus' ? totalFocus : totalBreak) : totalToUse;

      if (state.isRunning && state.startedAt != null) {
        const elapsed = Math.floor((Date.now() - state.startedAt) / 1000);
        const remaining = Math.max(0, effectiveTotal - elapsed);
        if (remaining > 0) {
          this.timeRemaining.set(remaining);
          this.startedAt.set(state.startedAt);
          this.isRunning.set(true);
        } else {
          // El segmento ya venció en segundo plano: no contabilizar métricas al recargar
          // (evita avanzar sesión / sumar minutos en cada F5). Queda pausado en 00:00.
          this.timeRemaining.set(0);
          this.startedAt.set(null);
          this.isRunning.set(false);
        }
      } else {
        const rawRem = state.remainingSeconds ?? effectiveTotal;
        const clamped = Math.min(Math.max(0, rawRem), effectiveTotal);
        const saved = wasShortConfig ? effectiveTotal : clamped;
        this.timeRemaining.set(saved);
        this.startedAt.set(null);
        this.isRunning.set(false);
      }

      this.ensureFirstDailySessionNotStuckInBreak();
    } catch (e) {
      console.error('Error loading timer state', e);
      this.currentMode.set('focus');
      this.timeRemaining.set(this.timerConfig().focusDuration * 60);
      this.isRunning.set(false);
      this.startedAt.set(null);
    }
  }

  private runTimerCompleteLogic(): void {
    this.stopInterval();
    this.isRunning.set(false);
    this.startedAt.set(null);
    const config = this.timerConfig();

    if (this.currentMode() === 'focus') {
      this.dailyService.addFocusMinutes(config.focusDuration);
      this.dailyService.incrementCompletedSession();
      const completed = this.dailyService.completedSessions();
      this.browserTabProgress.showTemporaryTitle(
        this.translate.instant('browserTab.goodBlock', { count: completed }),
        3600
      );
      this.notificationService.notifyFocusSessionCompleted();
      const isLong = completed > 0 && completed % config.sessionsUntilLongBreak === 0;
      this.currentMode.set('break');
      this.timeRemaining.set((isLong ? config.longBreakDuration : config.breakDuration) * 60);
    } else {
      this.browserTabProgress.showTemporaryTitle(
        this.translate.instant('browserTab.backToFocus', { count: this.sessionsCompleted() }),
        3200
      );
      this.notificationService.notifyBreakCompleted();
      this.currentMode.set('focus');
      this.timeRemaining.set(config.focusDuration * 60);
    }
  }

  private saveTimerState(state: TimerPersistedState): void {
    try {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving timer state', e);
    }
  }

  ngOnDestroy(): void {
    this.stopInterval();
    this.browserTabProgress.reset();
  }

  private startInterval(): void {
    this.stopInterval();
    if (this.startedAt() == null) this.startedAt.set(Date.now());
    this.intervalId = window.setInterval(() => {
      const current = this.timeRemaining();
      if (current > 0) {
        this.timeRemaining.set(current - 1);
      } else {
        this.runTimerCompleteLogic();
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
    this.startedAt.set(null);
    this.runTimerCompleteLogic();
  }

  formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  startTimer(): void {
    this.notificationService.prepareAudio();
    const isFirstFocus = !this.hasShownFirstFocusIntro() && this.currentMode() === 'focus';
    const isFirstBreak = !this.hasShownFirstBreakIntro() && this.currentMode() === 'break';
    if (isFirstFocus || isFirstBreak) {
      this.sessionIntroVisible.set(true);
      if (isFirstFocus) this.hasShownFirstFocusIntro.set(true);
      if (isFirstBreak) this.hasShownFirstBreakIntro.set(true);
    }
    this.startedAt.set(Date.now());
    this.isRunning.set(true);
  }

  pauseTimer(): void {
    this.isRunning.set(false);
    this.startedAt.set(null);
  }

  toggleTimer(): void {
    if (this.isRunning()) this.pauseTimer();
    else this.startTimer();
  }

  closeSessionIntro(): void {
    this.sessionIntroVisible.set(false);
  }

  resetTimer(): void {
    this.isRunning.set(false);
    this.startedAt.set(null);
    this.timeRemaining.set(this.getTargetSecondsForCurrentMode());
  }

  private getTargetSecondsForCurrentMode(): number {
    const config = this.timerConfig();
    if (this.currentMode() === 'focus') return config.focusDuration * 60;
    const isLong = this.sessionsCompleted() > 0 && this.sessionsCompleted() % config.sessionsUntilLongBreak === 0;
    return (isLong ? config.longBreakDuration : config.breakDuration) * 60;
  }

  requestSkipToBreak(): void {
    if (this.currentMode() === 'break') {
      this.doSkipToFocus();
      return;
    }
    const total = this.currentSegmentTotalSeconds();
    const remaining = this.timeRemaining();
    const noCompletoLos25Min = remaining < total && remaining > 0;
    if (noCompletoLos25Min) {
      this.skipConfirmVisible.set(true);
    } else {
      this.doSkipToBreak();
    }
  }

  confirmSkipToBreak(): void {
    this.skipConfirmVisible.set(false);
    this.doSkipToBreak();
  }

  cancelSkipConfirm(): void {
    this.skipConfirmVisible.set(false);
  }

  private doSkipToBreak(): void {
    this.isRunning.set(false);
    this.startedAt.set(null);
    if (this.dailyService.completedSessions() === 0) {
      const config = this.timerConfig();
      this.currentMode.set('focus');
      this.timeRemaining.set(config.focusDuration * 60);
      return;
    }
    this.currentMode.set('break');
    this.timeRemaining.set(this.timerConfig().breakDuration * 60);
  }

  private doSkipToFocus(): void {
    this.isRunning.set(false);
    this.startedAt.set(null);
    this.currentMode.set('focus');
    this.timeRemaining.set(this.timerConfig().focusDuration * 60);
  }

  onCelebrationReached(stats: CelebrationStats): void {
    if (this.shouldAskForName('share')) {
      this.openShareNamePrompt('share', stats);
      return;
    }
    this.celebrationStats.set(this.enrichStatsWithName(stats));
    this.celebrationVisible.set(true);
  }

  onShareSummaryRequest(stats: CelebrationStats): void {
    if (this.shouldAskForName('share')) {
      this.openShareNamePrompt('share', stats);
      return;
    }
    this.celebrationStats.set(this.enrichStatsWithName(stats));
    this.celebrationVisible.set(true);
  }

  /** Solo cierra el diálogo; no resetea. */
  onCelebrationClose(): void {
    this.celebrationVisible.set(false);
    this.celebrationStats.set(null);
  }

  /** Usuario pidió cerrar el día: mostrar confirmación. */
  requestCloseDay(): void {
    this.closeDayConfirmVisible.set(true);
  }

  confirmCloseDay(): void {
    this.closeDayConfirmVisible.set(false);
    this.celebrationVisible.set(false);
    this.celebrationStats.set(null);
    this.dailyService.resetDay();
    this.dailyService.setSummaryGenerated(true);
    this.resetTimer();
    this.timeRemaining.set(this.timerConfig().focusDuration * 60);
    this.currentMode.set('focus');
    this.taskListComponent?.resetCelebrationFlag();
  }

  cancelCloseDay(): void {
    this.closeDayConfirmVisible.set(false);
  }

  resetSessions(): void {
    this.dailyService.setCompletedSessions(0);
    this.dailyService.setTotalFocusMinutes(0);
    this.saveTimerState({
      mode: this.currentMode(),
      remainingSeconds: this.timeRemaining(),
      totalSeconds: this.currentSegmentTotalSeconds(),
      startedAt: null,
      isRunning: false,
      lastUpdatedAt: Date.now(),
      hasShownFirstFocusIntro: this.hasShownFirstFocusIntro(),
      hasShownFirstBreakIntro: this.hasShownFirstBreakIntro()
    });
  }

  openSettingsDialog(): void {
    const config = this.timerConfig();
    this.settingsFocusMinutes.set(config.focusDuration);
    this.settingsBreakMinutes.set(config.breakDuration);
    this.settingsError.set(null);
    this.settingsVisible.set(true);
  }

  closeSettingsDialog(): void {
    this.settingsVisible.set(false);
    this.settingsError.set(null);
  }

  onSettingsFocusInput(rawValue: number | null): void {
    this.settingsFocusMinutes.set(Number(rawValue ?? NaN));
  }

  onSettingsBreakInput(rawValue: number | null): void {
    this.settingsBreakMinutes.set(Number(rawValue ?? NaN));
  }

  resetPomodoroDefaults(): void {
    this.settingsFocusMinutes.set(DEFAULT_TIMER_CONFIG.focusDuration);
    this.settingsBreakMinutes.set(DEFAULT_TIMER_CONFIG.breakDuration);
    this.settingsError.set(null);
  }

  applyPomodoroPreset(focusMinutes: number, breakMinutes: number): void {
    this.settingsFocusMinutes.set(this.safeMinutes(focusMinutes, DEFAULT_TIMER_CONFIG.focusDuration, 1, 180));
    this.settingsBreakMinutes.set(this.safeMinutes(breakMinutes, DEFAULT_TIMER_CONFIG.breakDuration, 1, 60));
    this.settingsError.set(null);
  }

  savePomodoroSettings(): void {
    if (this.isRunning()) {
      this.settingsError.set(this.t('timer.settingsErrorPaused'));
      return;
    }

    const focus = this.safeMinutes(this.settingsFocusMinutes(), DEFAULT_TIMER_CONFIG.focusDuration, 1, 180);
    const rest = this.safeMinutes(this.settingsBreakMinutes(), DEFAULT_TIMER_CONFIG.breakDuration, 1, 60);
    if (focus !== this.settingsFocusMinutes() || rest !== this.settingsBreakMinutes()) {
      this.settingsError.set(this.t('timer.settingsErrorInvalid'));
      return;
    }

    const updated = {
      ...this.timerConfig(),
      focusDuration: focus,
      breakDuration: rest
    };
    this.timerConfig.set(updated);
    this.saveTimerConfig(updated);
    this.timeRemaining.set(this.getTargetSecondsForCurrentMode());
    this.settingsVisible.set(false);
    this.settingsError.set(null);
  }

  onShareNameInput(rawValue: string): void {
    this.shareNameInput.set(rawValue);
  }

  editShareName(): void {
    this.openShareNamePrompt('share');
  }

  closeShareNamePrompt(): void {
    this.shareNamePromptVisible.set(false);
    this.shareNameError.set(null);
    this.pendingShareStats.set(null);
  }

  saveNameAndContinue(): void {
    const normalized = this.normalizeDisplayName(this.shareNameInput());
    if (!normalized) {
      this.shareNameError.set(this.t('share.nameErrorRequired'));
      return;
    }
    if (normalized.length < 2) {
      this.shareNameError.set(this.t('share.nameErrorMin'));
      return;
    }
    this.shareDisplayName.set(normalized);
    this.dismissedFirstSessionPrompt.set(true);
    this.saveShareProfile();
    this.shareNamePromptVisible.set(false);
    this.shareNameError.set(null);

    const pending = this.pendingShareStats();
    if (pending) {
      this.celebrationStats.set(this.enrichStatsWithName(pending));
      this.celebrationVisible.set(true);
    }
    this.pendingShareStats.set(null);
  }

  continueWithoutName(): void {
    if (this.shareNamePromptContext() === 'first-session') {
      this.dismissedFirstSessionPrompt.set(true);
      this.saveShareProfile();
    }
    this.shareNamePromptVisible.set(false);
    this.shareNameError.set(null);

    const pending = this.pendingShareStats();
    if (pending) {
      this.celebrationStats.set(pending);
      this.celebrationVisible.set(true);
    }
    this.pendingShareStats.set(null);
  }

  dismissTransitionTip(): void {
    this.notificationService.dismissTransitionTip();
  }

  private t(key: string, params?: Record<string, unknown>): string {
    this.language.currentLanguage();
    this.language.translationTick();
    return this.translate.instant(key, params);
  }
}
