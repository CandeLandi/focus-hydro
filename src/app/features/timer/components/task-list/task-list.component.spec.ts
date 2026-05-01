import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ComponentFixture } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { TaskListComponent } from './task-list.component';
import { HydroFocusDailyService } from '../../../../core/services/hydrofocus-daily.service';
import { HydroTask } from '../../../../shared/models/daily.model';
import { LanguageService } from '../../../../core/i18n/language.service';

class HydroFocusDailyServiceMock {
  private tasksSignal = signal<HydroTask[]>([]);
  private completedSessionsSignal = signal(0);
  private totalFocusMinutesSignal = signal(0);
  private summaryGeneratedSignal = signal(false);

  tasks = this.tasksSignal.asReadonly();
  completedSessions = this.completedSessionsSignal.asReadonly();
  totalFocusMinutes = this.totalFocusMinutesSignal.asReadonly();
  summaryGenerated = this.summaryGeneratedSignal.asReadonly();

  addTask(task: HydroTask): void {
    this.tasksSignal.update(list => [...list, task]);
  }

  updateTask(id: string, patch: Partial<HydroTask>): void {
    this.tasksSignal.update(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }

  removeTask(id: string): void {
    this.tasksSignal.update(list => list.filter(t => t.id !== id));
  }

  setSummaryGenerated(value: boolean): void {
    this.summaryGeneratedSignal.set(value);
  }

  setCompletedSessions(value: number): void {
    this.completedSessionsSignal.set(value);
  }

  setTotalFocusMinutes(value: number): void {
    this.totalFocusMinutesSignal.set(value);
  }
}

class TranslateServiceMock {
  instant(key: string): string {
    const values: Record<string, string> = {
      'stats.sessions': 'sessions',
      'stats.focusMin': 'focus min',
      'stats.tasks': 'tasks'
    };
    return values[key] ?? key;
  }
}

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let fixture: ComponentFixture<TaskListComponent>;
  let daily: HydroFocusDailyServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [
        { provide: HydroFocusDailyService, useClass: HydroFocusDailyServiceMock },
        { provide: TranslateService, useClass: TranslateServiceMock },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: signal('es'),
            translationTick: signal(0)
          }
        }
      ]
    })
      .overrideComponent(TaskListComponent, { set: { template: '' } })
      .compileComponents();

    fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    daily = TestBed.inject(HydroFocusDailyService) as unknown as HydroFocusDailyServiceMock;
    fixture.detectChanges();
  });

  it('adds a task with trimmed text', () => {
    component.newTask.set('  Preparar demo  ');
    component.addTask();

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].text).toBe('Preparar demo');
    expect(component.newTask()).toBe('');
  });

  it('does not add empty task', () => {
    component.newTask.set('   ');
    component.addTask();
    expect(component.tasks().length).toBe(0);
  });

  it('toggles task completion and sets completedAt', () => {
    daily.addTask({ id: '1', text: 'Task', completed: false, createdAt: Date.now() });
    component.toggleTaskCompletion('1', true);

    const updated = component.tasks().find(t => t.id === '1');
    expect(updated?.completed).toBeTrue();
    expect(typeof updated?.completedAt).toBe('number');
  });

  it('emits summary only when all tasks are completed', () => {
    const emitSpy = spyOn(component.shareSummaryRequest, 'emit');
    daily.addTask({ id: '1', text: 'A', completed: false, createdAt: Date.now() });

    component.emitShareSummary();
    expect(emitSpy).not.toHaveBeenCalled();

    component.toggleTaskCompletion('1', true);
    component.emitShareSummary();
    expect(emitSpy).toHaveBeenCalled();
  });

  it('computes task groups, completion percentage and stats', () => {
    daily.setCompletedSessions(3);
    daily.setTotalFocusMinutes(75);
    daily.addTask({ id: '1', text: 'A', completed: true, createdAt: 1 });
    daily.addTask({ id: '2', text: 'B', completed: false, createdAt: 2 });

    expect(component.completedCount()).toBe(1);
    expect(component.completionPercentage()).toBe(50);
    expect(component.pendingTasks().map(t => t.id)).toEqual(['2']);
    expect(component.doneTasks().map(t => t.id)).toEqual(['1']);
    expect(component.stats()[1]).toEqual({ value: '1h 15m', label: 'focus min', color: 'green' });
  });

  it('handles input changes and enter key', () => {
    component.onNewTaskChange('From input');
    component.onKeyDown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(component.tasks()[0].text).toBe('From input');
  });

  it('requires a second delete click and clears pending state after timeout', fakeAsync(() => {
    daily.addTask({ id: '1', text: 'A', completed: false, createdAt: 1 });
    const event = new MouseEvent('click');
    spyOn(event, 'stopPropagation');

    component.onDeleteButtonClick(component.tasks()[0], event);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(component.pendingDeleteTaskId()).toBe('1');
    expect(component.tasks().length).toBe(1);

    tick(4500);
    expect(component.pendingDeleteTaskId()).toBeNull();

    component.onDeleteButtonClick(component.tasks()[0], new MouseEvent('click'));
    component.onDeleteButtonClick(component.tasks()[0], new MouseEvent('click'));
    expect(component.tasks()).toEqual([]);
  }));

  it('emits celebration once when all tasks become completed', () => {
    const emitSpy = spyOn(component.celebrationReached, 'emit');
    daily.addTask({ id: '1', text: 'A', completed: false, createdAt: 1 });

    component.toggleTaskCompletion('1', true);
    TestBed.flushEffects();
    fixture.detectChanges();

    expect(emitSpy).toHaveBeenCalledWith(jasmine.objectContaining({
      tasksCompleted: 1,
      completionPercentage: 100
    }));
    expect(emitSpy).toHaveBeenCalledTimes(1);
  });
});

