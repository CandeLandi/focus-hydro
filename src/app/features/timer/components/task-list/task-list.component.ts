import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  date: Date;
}

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-list.component.html',
  styles: []
})
export class TaskListComponent {
  @Input() tasks: Task[] = [];
  @Output() taskAdded = new EventEmitter<string>();
  @Output() taskToggled = new EventEmitter<string>();
  @Output() taskDeleted = new EventEmitter<string>();

  newTaskTitle = '';

  get completedTasks(): number {
    return this.tasks.filter(task => task.completed).length;
  }

  addTask(): void {
    if (this.newTaskTitle.trim()) {
      this.taskAdded.emit(this.newTaskTitle.trim());
      this.newTaskTitle = '';
    }
  }

  toggleTask(taskId: string): void {
    this.taskToggled.emit(taskId);
  }

  deleteTask(taskId: string): void {
    this.taskDeleted.emit(taskId);
  }
}
