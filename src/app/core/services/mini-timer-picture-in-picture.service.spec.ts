import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { MiniTimerActions, MiniTimerPictureInPictureService, MiniTimerViewState } from './mini-timer-picture-in-picture.service';

describe('MiniTimerPictureInPictureService', () => {
  let service: MiniTimerPictureInPictureService;
  let pipDocument: Document;
  let fakeWindow: Window;
  let requestWindow: jasmine.Spy;
  let actions: MiniTimerActions;
  const state: MiniTimerViewState = {
    appName: 'FocusFlow',
    modeLabel: 'FOCUS',
    mode: 'focus',
    remainingTime: '25:00',
    sessionLabel: 'Session 1 · FOCUS',
    isRunning: true,
    canSwitchSegment: true,
    switchSegmentLabel: 'Break',
    primaryActionLabel: 'Pause'
  };

  beforeEach(() => {
    pipDocument = document.implementation.createHTMLDocument('pip');
    let closed = false;
    const events = new EventTarget();
    fakeWindow = {
      document: pipDocument,
      get closed() { return closed; },
      close: jasmine.createSpy('close').and.callFake(() => { closed = true; }),
      focus: jasmine.createSpy('focus'),
      addEventListener: events.addEventListener.bind(events),
      removeEventListener: events.removeEventListener.bind(events),
      dispatchEvent: events.dispatchEvent.bind(events)
    } as unknown as Window;
    requestWindow = jasmine.createSpy('requestWindow').and.resolveTo(fakeWindow);
    Object.defineProperty(window, 'documentPictureInPicture', {
      configurable: true,
      value: { requestWindow }
    });
    actions = {
      onToggleRun: jasmine.createSpy('onToggleRun'),
      onSwitchSegment: jasmine.createSpy('onSwitchSegment'),
      onClose: jasmine.createSpy('onClose')
    };
    TestBed.configureTestingModule({});
    service = TestBed.inject(MiniTimerPictureInPictureService);
  });

  afterEach(() => {
    service.close();
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: undefined });
  });

  it('detects Document Picture-in-Picture support', () => {
    expect(service.isSupported()).toBeTrue();
  });

  it('opens the PiP window, renders shell and wires actions', async () => {
    const opened = await service.open(state, actions);

    expect(opened).toBeTrue();
    expect(requestWindow).toHaveBeenCalledWith({ width: 332, height: 236 });
    expect(pipDocument.getElementById('mini-time-text')?.textContent).toBe('25:00');

    pipDocument.getElementById('mini-toggle-btn')?.dispatchEvent(new Event('click'));
    pipDocument.getElementById('mini-switch-btn')?.dispatchEvent(new Event('click'));

    expect(actions.onToggleRun).toHaveBeenCalled();
    expect(actions.onSwitchSegment).toHaveBeenCalled();
  });

  it('updates rendered state and disables switch action when needed', async () => {
    await service.open(state, actions);

    service.update({
      ...state,
      mode: 'break',
      modeLabel: 'HYDRATION',
      remainingTime: '05:00',
      isRunning: false,
      canSwitchSegment: false,
      primaryActionLabel: 'Resume'
    });

    const card = pipDocument.getElementById('mini-root-card');
    const switchBtn = pipDocument.getElementById('mini-switch-btn') as HTMLButtonElement;
    expect(card?.getAttribute('data-mode')).toBe('break');
    expect(card?.getAttribute('data-running')).toBe('false');
    expect(pipDocument.getElementById('mini-time-text')?.textContent).toBe('05:00');
    expect(switchBtn.disabled).toBeTrue();
  });

  it('reuses and focuses an already open PiP window', async () => {
    await service.open(state, actions);
    await service.open({ ...state, remainingTime: '24:59' }, actions);

    expect(requestWindow).toHaveBeenCalledTimes(1);
    expect(fakeWindow.focus).toHaveBeenCalled();
    expect(pipDocument.getElementById('mini-time-text')?.textContent).toBe('24:59');
  });

  it('cleans up when the PiP window closes', async () => {
    await service.open(state, actions);

    fakeWindow.dispatchEvent(new Event('pagehide'));

    expect(actions.onClose).toHaveBeenCalled();
    expect(service.isOpen()).toBeFalse();
  });

  it('returns false when the API is unsupported', async () => {
    Object.defineProperty(window, 'documentPictureInPicture', { configurable: true, value: undefined });
    const fresh = TestBed.inject(MiniTimerPictureInPictureService);

    await expectAsync(fresh.open(state, actions)).toBeResolvedTo(false);
  });
});
