import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { TaskListComponent } from './task-list.component';
import { HydroFocusDailyService } from '../../../../core/services/hydrofocus-daily.service';
import { HydroTask } from '../../../../shared/models/daily.model';

class HydroFocusDailyServiceMock {
  private tasksSignal = signal<HydroTask[]>([]);
  private completedSessionsSignal = signal(0);
  private totalFocusMinutesSignal = signal(0);

  tasks = this.tasksSignal.asReadonly();
  completedSessions = this.completedSessionsSignal.asReadonly();
  totalFocusMinutes = this.totalFocusMinutesSignal.asReadonly();

  addTask(task: HydroTask): void {
    this.tasksSignal.update(list => [...list, task]);
  }

  updateTask(id: string, patch: Partial<HydroTask>): void {
    this.tasksSignal.update(list => list.map(t => (t.id === id ? { ...t, ...patch } : t)));
  }

  removeTask(id: string): void {
    this.tasksSignal.update(list => list.filter(t => t.id !== id));
  }
}

describe('TaskListComponent', () => {
  let component: TaskListComponent;
  let daily: HydroFocusDailyServiceMock;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskListComponent],
      providers: [{ provide: HydroFocusDailyService, useClass: HydroFocusDailyServiceMock }]
    })
      .overrideComponent(TaskListComponent, { set: { template: '' } })
      .compileComponents();

    const fixture = TestBed.createComponent(TaskListComponent);
    component = fixture.componentInstance;
    daily = TestBed.inject(HydroFocusDailyService) as unknown as HydroFocusDailyServiceMock;
    fixture.detectChanges();
  });

  it('adds a task with trimmed text', () => {
    component.newTask = '  Preparar demo  ';
    component.addTask();

    expect(component.tasks().length).toBe(1);
    expect(component.tasks()[0].text).toBe('Preparar demo');
    expect(component.newTask).toBe('');
  });

  it('does not add empty task', () => {
    component.newTask = '   ';
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
});

