import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TimerComponent } from './timer.component';
import { HydroFocusDailyService } from '../../core/services/hydrofocus-daily.service';
import { NotificationService } from '../../core/services/notification.service';
import { BrowserTabProgressService } from '../../core/services/browser-tab-progress.service';
import { HydroTask } from '../../shared/models/daily.model';
import { TimerPersistedState } from '../../shared/models/timer-state.model';

const TIMER_STATE_KEY = 'hydrofocus-timer-state';

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
  restoreDefaults = jasmine.createSpy('restoreDefaults');
}

describe('TimerComponent', () => {
  let component: TimerComponent;
  let daily: HydroFocusDailyServiceMock;
  let notification: NotificationServiceMock;
  let browserTab: BrowserTabProgressServiceMock;

  beforeEach(async () => {
    localStorage.removeItem(TIMER_STATE_KEY);
    await TestBed.configureTestingModule({
      imports: [TimerComponent],
      providers: [
        { provide: HydroFocusDailyService, useClass: HydroFocusDailyServiceMock },
        { provide: NotificationService, useClass: NotificationServiceMock },
        { provide: BrowserTabProgressService, useClass: BrowserTabProgressServiceMock }
      ]
    })
      .overrideComponent(TimerComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(TimerComponent);
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
    (component as any).runTimerCompleteLogic();

    expect(daily.completedSessions()).toBe(1);
    expect(daily.totalFocusMinutes()).toBe(25);
    expect(component.currentMode()).toBe('break');
    expect(notification.notifyFocusSessionCompleted).toHaveBeenCalled();
  });

  it('running state updates browser tab service', () => {
    component.isRunning.set(true);
    component.timeRemaining.set(1490);
    expect(browserTab.update).toHaveBeenCalled();
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

  it('skip to break does nothing to mode when no session completed yet', () => {
    daily.setCompletedSessions(0);
    component.currentMode.set('focus');
    component.timeRemaining.set(25 * 60);
    (component as unknown as { doSkipToBreak(): void }).doSkipToBreak();
    expect(component.currentMode()).toBe('focus');
    expect(component.timeRemaining()).toBe(25 * 60);
  });
});

