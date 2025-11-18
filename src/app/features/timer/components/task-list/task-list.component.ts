import { Component, signal, computed, OnInit, effect, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { QuickStatsComponent, StatCard } from '../../../../components/shared/quick-stats/quick-stats.component';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule, InputTextModule, CheckboxModule, ButtonModule, ToastModule, QuickStatsComponent],
  templateUrl: './task-list.component.html',
  styles: [],
  providers: [MessageService],
  host: {
    class: 'block h-full'
  }
})
export class TaskListComponent implements OnInit {
  sessionsCompleted = input<number>(0);

  tasks = signal<Task[]>([]);
  newTask: string = '';

  private readonly STORAGE_KEY = 'hydrofocus-tasks';

  // Computed properties
  completedCount = computed(() => this.tasks().filter(t => t.completed).length);

  today = computed(() => {
    return new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  });

  completionPercentage = computed(() => {
    const total = this.tasks().length;
    return total > 0 ? Math.round((this.completedCount() / total) * 100) : 0;
  });

  // Estadísticas para mostrar
  stats = computed<StatCard[]>(() => [
    {
      value: this.completedCount(),
      label: 'Completadas Hoy',
      color: 'blue'
    },
    {
      value: `${this.sessionsCompleted()}h`,
      label: 'Enfoque Total',
      color: 'green'
    },
    {
      value: `${this.completionPercentage()}%`,
      label: 'Progreso',
      color: 'green'
    }
  ]);

  pendingDeleteTask = signal<{ id: string; text: string } | null>(null);

  constructor(
    private messageService: MessageService
  ) {
    // Effect para guardar las tareas automáticamente cuando cambian
    effect(() => {
      const tasks = this.tasks();
      this.saveTasks(tasks);
    });
  }

  ngOnInit(): void {
    this.loadTasks();
  }

  private loadTasks(): void {
    try {
      const savedTasks = localStorage.getItem(this.STORAGE_KEY);
      if (savedTasks) {
        this.tasks.set(JSON.parse(savedTasks));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  private saveTasks(tasks: Task[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  }

  addTask(): void {
    const trimmedTask = this.newTask.trim();
    if (trimmedTask) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: trimmedTask,
        completed: false,
        createdAt: Date.now(),
      };
      this.tasks.update(tasks => [...tasks, newTask]);
      this.newTask = '';
    }
  }

  private deleteTask(id: string): void {
    this.tasks.update(tasks => tasks.filter(task => task.id !== id));
  }

  confirmDeletePrompt(task: Task): void {
    this.pendingDeleteTask.set({ id: task.id, text: task.text });
    this.messageService.add({
      key: 'confirmDelete',
      severity: 'warn',
      summary: '¿Eliminar tarea?',
      detail: `"${task.text}"`,
      sticky: true
    });
  }

  confirmDelete(): void {
    const task = this.pendingDeleteTask();
    if (task) {
      this.deleteTask(task.id);
      this.pendingDeleteTask.set(null);
      this.messageService.clear('confirmDelete');
      this.messageService.add({
        key: 'taskFeedback',
        severity: 'success',
        summary: 'Tarea eliminada',
        detail: `"${task.text}" ha sido eliminada`,
        life: 2000
      });
    }
  }

  cancelDelete(): void {
    this.pendingDeleteTask.set(null);
    this.messageService.clear('confirmDelete');
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addTask();
    }
  }

  toggleTaskCompletion(taskId: string, completed: boolean): void {
    this.tasks.update(tasks =>
      tasks.map(task =>
        task.id === taskId ? { ...task, completed } : task
      )
    );
  }
}

