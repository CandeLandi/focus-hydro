import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NotificationService);
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
});

