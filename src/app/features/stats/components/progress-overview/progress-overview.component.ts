import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Achievements {
  totalSessions: number;
  totalMinutes: number;
  currentStreak: number;
  totalTasksCompleted: number;
  perfectDays: number;
  bestStreak: number;
  weeklyAverage: string;
  productivityScore: number;
}

@Component({
  selector: 'app-progress-overview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progress-overview.component.html',
  styles: []
})
export class ProgressOverviewComponent {
  @Input() achievements: Achievements = {
    totalSessions: 0,
    totalMinutes: 0,
    currentStreak: 0,
    totalTasksCompleted: 0,
    perfectDays: 0,
    bestStreak: 0,
    weeklyAverage: '0 tareas/día',
    productivityScore: 0
  };

  // Exponer Math para el template
  Math = Math;

  // Computed properties
  totalHours = computed(() => Math.floor(this.achievements.totalMinutes / 60));
  remainingMinutes = computed(() => this.achievements.totalMinutes % 60);

  // Consejos dinámicos basados en la racha
  getDailyTip(): string {
    if (this.achievements.currentStreak === 0) {
      return "Comienza tu primera sesión ahora. El mejor momento para empezar es hoy.";
    } else if (this.achievements.currentStreak < 3) {
      return "Excelente inicio. La consistencia diaria construye hábitos duraderos.";
    } else if (this.achievements.currentStreak < 7) {
      return "Vas por buen camino. Cada día de enfoque te acerca a tus metas.";
    } else if (this.achievements.currentStreak < 14) {
      return "Racha impresionante. Tu disciplina está dando resultados.";
    } else {
      return "Eres un maestro de la productividad. Tu dedicación es inspiradora.";
    }
  }

  // Logros disponibles
  getAvailableAchievements() {
    return [
      {
        title: "Primera Gota",
        description: "Completa tu primera sesión",
        unlocked: this.achievements.totalSessions >= 1,
        icon: "💧",
      },
      {
        title: "Héroe de Hidratación",
        description: "Completa 10 sesiones",
        unlocked: this.achievements.totalSessions >= 10,
        icon: "🌊",
      },
      {
        title: "Maestro del Enfoque",
        description: "Completa 50 sesiones",
        unlocked: this.achievements.totalSessions >= 50,
        icon: "🎯",
      },
      {
        title: "Guerrero Semanal",
        description: "Racha de 7 días",
        unlocked: this.achievements.bestStreak >= 7,
        icon: "🔥",
      },
      {
        title: "Corredor de Maratón",
        description: "10 horas de tiempo enfocado",
        unlocked: this.achievements.totalMinutes >= 600,
        icon: "⏱️",
      },
      {
        title: "Rey de la Consistencia",
        description: "Racha de 30 días",
        unlocked: this.achievements.bestStreak >= 30,
        icon: "👑",
      },
      {
        title: "Organizador",
        description: "Completa 25 tareas",
        unlocked: this.achievements.totalTasksCompleted >= 25,
        icon: "📝",
      },
      {
        title: "Perfeccionista",
        description: "Logra 5 días perfectos",
        unlocked: this.achievements.perfectDays >= 5,
        icon: "✨",
      },
    ];
  }
}
