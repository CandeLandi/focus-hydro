import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { TimerComponent } from './timer.component';
import { HydroFocusDailyService } from '../../core/services/hydrofocus-daily.service';
import { NotificationService } from '../../core/services/notification.service';
import { BrowserTabProgressService } from '../../core/services/browser-tab-progress.service';
import { HydroTask } from '../../shared/models/daily.model';
import { TimerPersistedState } from '../../shared/models/timer-state.model';
import { LanguageService } from '../../core/i18n/language.service';
import { MessageService } from 'primeng/api';

const TIMER_STATE_KEY = 'hydrofocus-timer-state';
const TIMER_CONFIG_KEY = 'hydrofocus-timer-config';

class HydroFocusDailyServiceMock {
  private tasksSignal = signal<HydroTask[]>([]);
  private completedSessionsSignal = signal(0);
  private totalFocusMinutesSignal = signal(0);

  tasks = this.tasksSignal.asReadonly();
  completedSessions = this.completedSessionsSignal.asReadonly();
  totalFocusMinutes = this.totalFocusMinutesSignal.asReadonly();

  loadAndMaybeResetDay(): void {}
  addFocusMinutes(minutes: number): void { this.totalFocusMinutesSignal.update(v => v + minutes); }
  incrementCompletedSession(): void { this.completedSessionsSignal.update(v => v + 1); }
  setCompletedSessions(count: number): void { this.completedSessionsSignal.set(count); }
  setTotalFocusMinutes(minutes: number): void { this.totalFocusMinutesSignal.set(minutes); }
  resetDay(): void { this.tasksSignal.set([]); this.completedSessionsSignal.set(0); this.totalFocusMinutesSignal.set(0); }
  setSummaryGenerated(): void {}
}

class NotificationServiceMock {
  transitionTip = signal(null);
  prepareAudio = jasmine.createSpy('prepareAudio');
  notifyFocusSessionCompleted = jasmine.createSpy('notifyFocusSessionCompleted');
  notifyBreakCompleted = jasmine.createSpy('notifyBreakCompleted');
  dismissTransitionTip = jasmine.createSpy('dismissTransitionTip');
}

class BrowserTabProgressServiceMock {
  update = jasmine.createSpy('update');
  showTemporaryTitle = jasmine.createSpy('showTemporaryTitle');
  reset = jasmine.createSpy('reset');
}

class TranslateServiceMock {
  instant(key: string, params?: Record<string, unknown>): string | string[] {
    const values: Record<string, string | string[]> = {
      'timer.pause': 'Pausar',
      'timer.resume': 'Reanudar',
      'timer.start': 'Iniciar',
      'timer.focus': 'CONCENTRACIÓN',
      'timer.break': 'HIDRATACIÓN',
      'timer.longBreak': 'DESCANSO LARGO',
      'timer.sessionLabel': `Sesión ${params?.['value'] ?? ''}`,
      'timer.rest': 'Descanso',
      'timer.back': 'Volver',
      'timer.oneThing': 'Una cosa a la vez.',
      'timer.settingsErrorPaused': 'Pausá el temporizador para guardar cambios.',
      'timer.settingsErrorInvalid': 'Ingresá minutos válidos: foco 1-180 y descanso 1-60.',
      'timer.breakMessages': ['Tomá agua'],
      'browserTab.goodBlock': `Buen bloque • Hora de descansar • 🔥 ${params?.['count'] ?? ''}`,
      'browserTab.backToFocus': `Volvemos al foco • 🔥 ${params?.['count'] ?? ''}`,
      'browserTab.paused': 'Pausado',
      'browserTab.lastMinuteFocus': 'Último minuto • Foco',
      'common.close': 'Cerrar',
      'share.nameErrorRequired': 'Ingresá tu nombre para continuar.',
      'share.nameErrorMin': 'Usá al menos 2 caracteres.',
      'timer.miniModeUnsupported': 'Mini no soportado.',
      'timer.mobileAlertsHint': 'Aviso móvil.',
      'timer.mobileHintsToastTitle': 'Pantalla chica'
    };
    return values[key] ?? key;
  }
}

describe('TimerComponent', () => {
  let component: TimerComponent;
  let fixture: ComponentFixture<TimerComponent>;
  let daily: HydroFocusDailyServiceMock;
  let notification: NotificationServiceMock;
  let browserTab: BrowserTabProgressServiceMock;

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [
        { provide: HydroFocusDailyService, useClass: HydroFocusDailyServiceMock },
        { provide: NotificationService, useClass: NotificationServiceMock },
        { provide: BrowserTabProgressService, useClass: BrowserTabProgressServiceMock },
        { provide: TranslateService, useClass: TranslateServiceMock },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: signal('es'),
            translationTick: signal(0)
          }
        },
        { provide: MessageService, useValue: { add: jasmine.createSpy('add') } }
      ]
    })
      .overrideComponent(TimerComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(TimerComponent);
    component = fixture.componentInstance;
    daily = TestBed.inject(HydroFocusDailyService) as unknown as HydroFocusDailyServiceMock;
    notification = TestBed.inject(NotificationService) as unknown as NotificationServiceMock;
    browserTab = TestBed.inject(BrowserTabProgressService) as unknown as BrowserTabProgressServiceMock;
    fixture.detectChanges();
  });

  it('applies pomodoro preset values', () => {
    component.applyPomodoroPreset(50, 10);
    expect(component.settingsFocusMinutes()).toBe(50);
    expect(component.settingsBreakMinutes()).toBe(10);
    expect(component.settingsError()).toBeNull();
  });

  it('does not save settings while timer is running', () => {
    component.isRunning.set(true);
    component.savePomodoroSettings();
    expect(component.settingsError()).toContain('Pausá el temporizador');
  });

  it('shows skip confirm when trying to skip incomplete focus block', () => {
    component.currentMode.set('focus');
    component.timeRemaining.set(1200); // < total 1500 by default
    component.requestSkipToBreak();
    expect(component.skipConfirmVisible()).toBeTrue();
  });

  it('focus completion increments session and switches to break', () => {
    component.currentMode.set('focus');
    (component as unknown as { runTimerCompleteLogic(): void }).runTimerCompleteLogic();

    expect(daily.completedSessions()).toBe(1);
    expect(daily.totalFocusMinutes()).toBe(25);
    expect(component.currentMode()).toBe('break');
    expect(component.isRunning()).toBeTrue();
    expect(notification.notifyFocusSessionCompleted).toHaveBeenCalled();
  });

  it('break completion switches back to focus and keeps running', () => {
    component.currentMode.set('break');

    (component as unknown as { runTimerCompleteLogic(): void }).runTimerCompleteLogic();

    expect(component.currentMode()).toBe('focus');
    expect(component.timeRemaining()).toBe(25 * 60);
    expect(component.isRunning()).toBeTrue();
    expect(notification.notifyBreakCompleted).toHaveBeenCalled();
  });

  it('running state updates browser tab service', () => {
    component.isRunning.set(true);
    component.timeRemaining.set(1490);
    expect(browserTab.update).toHaveBeenCalled();
  });

  it('computes timer state, labels and progress for idle, paused and running states', () => {
    expect(component.timerStateClass()['timer-idle']).toBeTrue();
    expect(component.mainButtonLabel()).toBe('Iniciar');
    expect(component.timerProgress()).toBe(0);
    expect(component.timerMicrocopy()).toBe('Una cosa a la vez.');

    component.timeRemaining.set(1200);
    expect(component.timerStateClass()['timer-paused']).toBeTrue();
    expect(component.mainButtonLabel()).toBe('Reanudar');
    expect(component.timerProgress()).toBe(20);

    component.isRunning.set(true);
    expect(component.timerStateClass()['timer-running']).toBeTrue();
    expect(component.mainButtonLabel()).toBe('Pausar');

    component.currentMode.set('break');
    expect(component.isBreak()).toBeTrue();
    expect(component.skipActionIcon()).toBe('pi pi-bolt');
    expect(component.timerMicrocopy()).toBe('Tomá agua');
  });

  it('computes long break and next-long-break states', () => {
    daily.setTotalFocusMinutes(75);
    component.currentMode.set('focus');
    expect(component.nextIsLongBreak()).toBeTrue();

    component.currentMode.set('break');
    daily.setTotalFocusMinutes(100);
    expect(component.isLongBreak()).toBeTrue();
  });

  it('returns zero progress when the configured segment total is zero', () => {
    component.timerConfig.set({ focusDuration: 0, breakDuration: 5, longBreakDuration: 15, sessionsUntilLongBreak: 4 });

    expect(component.timerProgress()).toBe(0);
  });

  it('with zero completed sessions, persisted break state loads as focus', () => {
    const persisted: TimerPersistedState = {
      mode: 'break',
      remainingSeconds: 300,
      totalSeconds: 300,
      startedAt: null,
      isRunning: false,
      lastUpdatedAt: Date.now(),
      hasShownFirstFocusIntro: false,
      hasShownFirstBreakIntro: false
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(persisted));

    const fixture2 = TestBed.createComponent(TimerComponent);
    const c = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(c.currentMode()).toBe('focus');
    expect(c.timeRemaining()).toBe(25 * 60);
  });

  it('manual skip to break starts the break immediately', () => {
    daily.setCompletedSessions(0);
    component.currentMode.set('focus');
    component.timeRemaining.set(25 * 60);
    (component as unknown as { doSkipToBreak(): void }).doSkipToBreak();
    expect(component.currentMode()).toBe('break');
    expect(component.timeRemaining()).toBe(5 * 60);
    expect(component.isRunning()).toBeTrue();
  });

  it('moves to the next segment without staying at zero', fakeAsync(() => {
    component.currentMode.set('focus');
    component.timeRemaining.set(1);
    component.startTimer();
    TestBed.flushEffects();
    fixture.detectChanges();

    tick(1000);

    expect(component.timeRemaining()).toBe(5 * 60);
    expect(component.currentMode()).toBe('break');
    expect(component.isRunning()).toBeTrue();
    discardPeriodicTasks();
  }));

  it('completes an expired running persisted state and starts the next segment', () => {
    const persisted: TimerPersistedState = {
      mode: 'focus',
      remainingSeconds: 1,
      totalSeconds: 25 * 60,
      startedAt: Date.now() - 26 * 60 * 1000,
      isRunning: true,
      lastUpdatedAt: Date.now(),
      hasShownFirstFocusIntro: true,
      hasShownFirstBreakIntro: false
    };
    localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(persisted));

    const fixture2 = TestBed.createComponent(TimerComponent);
    const c = fixture2.componentInstance;
    fixture2.detectChanges();

    expect(c.currentMode()).toBe('break');
    expect(c.timeRemaining()).toBe(5 * 60);
    expect(c.isRunning()).toBeTrue();
    expect(daily.completedSessions()).toBe(1);
  });

  it('saves valid settings only while paused', () => {
    component.settingsFocusMinutes.set(45);
    component.settingsBreakMinutes.set(8);

    component.savePomodoroSettings();

    expect(component.timerConfig().focusDuration).toBe(45);
    expect(component.timerConfig().breakDuration).toBe(8);
    expect(localStorage.getItem(TIMER_CONFIG_KEY)).toContain('"focusDuration":45');
  });

  it('rejects invalid settings values', () => {
    component.settingsFocusMinutes.set(0);
    component.settingsBreakMinutes.set(90);

    component.savePomodoroSettings();

    expect(component.settingsError()).toContain('Ingresá minutos válidos');
  });

  it('resets current mode target seconds and pauses', () => {
    component.currentMode.set('break');
    component.timeRemaining.set(42);
    component.isRunning.set(true);

    component.resetTimer();

    expect(component.isRunning()).toBeFalse();
    expect(component.timeRemaining()).toBe(5 * 60);
  });

  it('confirms and cancels skip to break', () => {
    component.currentMode.set('focus');
    component.timeRemaining.set(1200);

    component.requestSkipToBreak();
    expect(component.skipConfirmVisible()).toBeTrue();

    component.cancelSkipConfirm();
    expect(component.skipConfirmVisible()).toBeFalse();

    component.requestSkipToBreak();
    component.confirmSkipToBreak();
    expect(component.currentMode()).toBe('break');
  });

  it('handles celebration and share summary name prompts', () => {
    const stats = { tasksCompleted: 1, totalFocusTime: '25m', completionPercentage: 100, date: new Date() };

    component.onCelebrationReached(stats);
    expect(component.shareNamePromptVisible()).toBeTrue();

    component.onShareNameInput('Candela');
    component.saveNameAndContinue();
    expect(component.celebrationStats()?.displayName).toBe('Candela');
    expect(component.shareNamePromptVisible()).toBeFalse();

    component.onShareSummaryRequest(stats);
    expect(component.celebrationStats()?.displayName).toBe('Candela');
  });

  it('validates share name input and supports continuing without name', () => {
    const stats = { tasksCompleted: 1, totalFocusTime: '25m', completionPercentage: 100, date: new Date() };

    component.onShareSummaryRequest(stats);
    component.onShareNameInput(' ');
    component.saveNameAndContinue();
    expect(component.shareNameError()).toContain('Ingresá tu nombre');

    component.onShareNameInput('A');
    component.saveNameAndContinue();
    expect(component.shareNameError()).toContain('Usá al menos 2');

    component.continueWithoutName();
    expect(component.celebrationStats()?.displayName).toBeUndefined();
  });

  it('closes dialogs and close-day flow resets state', () => {
    component.celebrationVisible.set(true);
    component.celebrationStats.set({ tasksCompleted: 1, totalFocusTime: '25m', completionPercentage: 100, date: new Date() });

    component.onCelebrationClose();
    expect(component.celebrationVisible()).toBeFalse();

    component.requestCloseDay();
    expect(component.closeDayConfirmVisible()).toBeTrue();
    component.cancelCloseDay();
    expect(component.closeDayConfirmVisible()).toBeFalse();

    component.requestCloseDay();
    component.confirmCloseDay();
    expect(component.currentMode()).toBe('focus');
    expect(component.timeRemaining()).toBe(25 * 60);
  });
});

