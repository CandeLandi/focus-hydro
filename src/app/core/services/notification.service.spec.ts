import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../i18n/language.service';
import { NotificationService } from './notification.service';

class TranslateServiceMock {
  instant(key: string): string | string[] {
    const values: Record<string, string | string[]> = {
      'notifications.tipFocusDone': 'Tiempo de enfoque completado',
      'notifications.tipBackToFocus': 'Volvemos al enfoque',
      'notifications.focusTitle': 'Bloque de foco completo',
      'notifications.focusMessage': 'Descansá',
      'notifications.breakTitle': 'Descanso terminado',
      'notifications.breakMessage': 'Volvé al foco',
      'notifications.focusToBreakTips': ['Tip foco 1', 'Tip foco 2', 'Tip foco 3'],
      'notifications.breakToFocusTips': ['Tip descanso 1', 'Tip descanso 2']
    };
    return values[key] ?? key;
  }
}

describe('NotificationService', () => {
  let service: NotificationService;
  const originalAudioContext = window.AudioContext;
  const originalNotification = window.Notification;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useClass: TranslateServiceMock },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: signal('es'),
            translationTick: signal(0)
          }
        }
      ]
    });
    service = TestBed.inject(NotificationService);
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: originalAudioContext });
    Object.defineProperty(window, 'Notification', { configurable: true, value: originalNotification });
  });

  it('shows focus-to-break tip with expected title', () => {
    service.showTransitionTip('focus-to-break');
    const tip = service.transitionTip();
    expect(tip).toBeTruthy();
    expect(tip?.type).toBe('focus-to-break');
    expect(tip?.title).toBe('Tiempo de enfoque completado');
    expect(tip?.message.length).toBeGreaterThan(0);
  });

  it('shows break-to-focus tip with expected title', () => {
    service.showTransitionTip('break-to-focus');
    const tip = service.transitionTip();
    expect(tip).toBeTruthy();
    expect(tip?.type).toBe('break-to-focus');
    expect(tip?.title).toBe('Volvemos al enfoque');
  });

  it('does not repeat same tip consecutively for same type', () => {
    // Force deterministic picks: first call index 0, second call attempts 0 then 1 (while loop retries).
    const randSpy = spyOn(Math, 'random').and.returnValues(0, 0, 0.35);

    service.showTransitionTip('focus-to-break');
    const first = service.transitionTip()?.message;

    service.showTransitionTip('focus-to-break');
    const second = service.transitionTip()?.message;

    expect(randSpy).toHaveBeenCalled();
    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);
  });

  it('auto-hides visible tip after timeout', fakeAsync(() => {
    service.showTransitionTip('focus-to-break');
    expect(service.transitionTip()).toBeTruthy();

    tick(5200);
    expect(service.transitionTip()).toBeNull();
  }));

  it('dismissTransitionTip clears current tip immediately', () => {
    service.showTransitionTip('break-to-focus');
    expect(service.transitionTip()).toBeTruthy();

    service.dismissTransitionTip();
    expect(service.transitionTip()).toBeNull();
  });

  it('loads, updates and persists notification settings', () => {
    expect(service.getSettings()).toEqual({
      enabled: true,
      soundEnabled: true,
      browserNotificationEnabled: true
    });

    service.updateSettings({ enabled: false, soundEnabled: false });

    expect(service.getSettings().enabled).toBeFalse();
    expect(JSON.parse(localStorage.getItem('hydrofocus-notification-settings') ?? '{}').soundEnabled).toBeFalse();
  });

  it('does not notify when notifications are disabled', async () => {
    service.updateSettings({ enabled: false });

    await service.notifyFocusSessionCompleted();
    await service.notifyBreakCompleted();

    expect(service.transitionTip()).toBeNull();
  });

  it('requests browser notification permission when available', async () => {
    const requestPermission = jasmine.createSpy('requestPermission').and.resolveTo('granted');
    Object.defineProperty(window, 'Notification', {
      configurable: true,
      value: { permission: 'default', requestPermission }
    });

    await expectAsync(service.requestPermission()).toBeResolvedTo(true);
    expect(requestPermission).toHaveBeenCalled();
  });

  it('handles missing, granted and denied notification permissions', async () => {
    delete (window as unknown as { Notification?: Notification }).Notification;
    await expectAsync(service.requestPermission()).toBeResolvedTo(false);

    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'granted' } });
    await expectAsync(service.requestPermission()).toBeResolvedTo(true);

    Object.defineProperty(window, 'Notification', { configurable: true, value: { permission: 'denied' } });
    await expectAsync(service.requestPermission()).toBeResolvedTo(false);
  });

  it('shows browser notifications and wires click handling', async () => {
    const closeSpy = jasmine.createSpy('close');
    const notificationInstances: Array<{ close: jasmine.Spy; onclick?: () => void }> = [];
    const NotificationCtor = function (_title: string, _options: NotificationOptions) {
      const instance = { close: closeSpy, onclick: undefined as (() => void) | undefined };
      notificationInstances.push(instance);
      return instance;
    };
    Object.defineProperty(NotificationCtor, 'permission', { configurable: true, value: 'granted' });
    Object.defineProperty(window, 'Notification', { configurable: true, value: NotificationCtor });
    spyOn(window, 'focus');
    service.updateSettings({ soundEnabled: false, browserNotificationEnabled: true });

    await service.notifyFocusSessionCompleted();
    notificationInstances[0].onclick?.();

    expect(notificationInstances.length).toBe(1);
    expect(closeSpy).toHaveBeenCalled();
    expect(window.focus).toHaveBeenCalled();
  });

  it('plays focus and break sounds when audio is available', async () => {
    const oscillator = {
      frequency: { value: 0 },
      type: 'sine' as OscillatorType,
      connect: jasmine.createSpy('oscConnect'),
      start: jasmine.createSpy('start'),
      stop: jasmine.createSpy('stop')
    };
    const gain = {
      gain: {
        setValueAtTime: jasmine.createSpy('setValueAtTime'),
        linearRampToValueAtTime: jasmine.createSpy('linearRampToValueAtTime')
      },
      connect: jasmine.createSpy('gainConnect')
    };
    class FakeAudioContext {
      state: AudioContextState = 'running';
      currentTime = 0;
      destination = {};
      createOscillator = jasmine.createSpy('createOscillator').and.returnValue(oscillator);
      createGain = jasmine.createSpy('createGain').and.returnValue(gain);
      resume = jasmine.createSpy('resume');
    }
    Object.defineProperty(window, 'AudioContext', { configurable: true, writable: true, value: FakeAudioContext });
    service.updateSettings({ soundEnabled: true, browserNotificationEnabled: false });

    service.prepareAudio();
    await service.notifyFocusSessionCompleted();
    await service.notifyBreakCompleted();

    expect(oscillator.start).toHaveBeenCalled();
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();
  });
});

