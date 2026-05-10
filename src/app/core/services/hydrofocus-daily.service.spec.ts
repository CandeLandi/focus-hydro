import { TestBed } from '@angular/core/testing';
import { HydroFocusDailyService } from './hydrofocus-daily.service';
import { DailyState, getTodayDateKey, HydroTask } from '../../shared/models/daily.model';

const STORAGE_KEY = 'hydrofocus-daily';
const TIMER_CONFIG_KEY = 'hydrofocus-timer-config';

describe('HydroFocusDailyService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  afterEach(() => {
    localStorage.clear();
  });

  function createService(): HydroFocusDailyService {
    return TestBed.inject(HydroFocusDailyService);
  }

  it('initializes and persists an empty state for today', () => {
    const service = createService();

    expect(service.dateKey()).toBe(getTodayDateKey());
    expect(service.tasks()).toEqual([]);
    expect(service.completedSessions()).toBe(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}').dateKey).toBe(getTodayDateKey());
  });

  it('resets stale stored state when the day changes', () => {
    const staleState: DailyState = {
      dateKey: '2000-01-01',
      tasks: [{ id: '1', text: 'Old', completed: false, createdAt: 1 }],
      completedSessions: 3,
      totalFocusMinutes: 75,
      summaryGenerated: true
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(staleState));
    localStorage.setItem('hydrofocus-timer-state', '{"mode":"focus","isRunning":true}');

    const service = createService();

    expect(service.dateKey()).toBe(getTodayDateKey());
    expect(service.tasks()).toEqual([]);
    expect(service.completedSessions()).toBe(0);
    expect(service.summaryGenerated()).toBeFalse();
    expect(localStorage.getItem('hydrofocus-timer-state')).toBeNull();
  });

  it('recovers from invalid stored JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');

    const service = createService();

    expect(service.tasks()).toEqual([]);
    expect(service.dateKey()).toBe(getTodayDateKey());
  });

  it('mutates tasks and metrics while persisting every change', () => {
    const service = createService();
    const task: HydroTask = { id: 'a', text: 'Write tests', completed: false, createdAt: 10 };

    service.addTask(task);
    service.updateTask('a', { completed: true, completedAt: 20 });
    service.addFocusMinutes(25);
    service.incrementCompletedSession();
    service.setSummaryGenerated(true);

    expect(service.tasks()[0]).toEqual({ ...task, completed: true, completedAt: 20 });
    expect(service.totalFocusMinutes()).toBe(25);
    expect(service.completedSessions()).toBe(1);
    expect(service.summaryGenerated()).toBeTrue();

    service.removeTask('a');
    expect(service.tasks()).toEqual([]);
  });

  it('corrects legacy focus minutes using configured focus duration', () => {
    localStorage.setItem(TIMER_CONFIG_KEY, JSON.stringify({ focusDuration: 50 }));
    const legacy: DailyState = {
      dateKey: getTodayDateKey(),
      tasks: [],
      completedSessions: 2,
      totalFocusMinutes: 2,
      summaryGenerated: false
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(legacy));

    const service = createService();

    expect(service.totalFocusMinutes()).toBe(100);
    expect(service.completedSessions()).toBe(2);
  });

  it('derives completed sessions only when stored sessions are zero', () => {
    localStorage.setItem(TIMER_CONFIG_KEY, JSON.stringify({ focusDuration: 25 }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      dateKey: getTodayDateKey(),
      tasks: [],
      completedSessions: 0,
      totalFocusMinutes: 75,
      summaryGenerated: false
    } satisfies DailyState));

    const service = createService();

    expect(service.completedSessions()).toBe(3);
  });
});
