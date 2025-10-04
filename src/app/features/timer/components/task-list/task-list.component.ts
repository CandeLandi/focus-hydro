import { Component, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.component.html',
  styles: []
})
export class TaskListComponent {
  tasks = signal<Task[]>([]);
  newTask = signal<string>('');

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

  addTask(): void {
    if (this.newTask().trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        text: this.newTask().trim(),
        completed: false,
        createdAt: Date.now(),
      };
      this.tasks.update(tasks => [...tasks, newTask]);
      this.newTask.set('');
    }
  }

  toggleTask(id: string): void {
    this.tasks.update(tasks =>
      tasks.map(task =>
        task.id === id ? { ...task, completed: !task.completed } : task
      )
    );
  }

  deleteTask(id: string): void {
    this.tasks.update(tasks => tasks.filter(task => task.id !== id));
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addTask();
    }
  }
}

