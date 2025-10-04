import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress?: number;
  maxProgress?: number;
  color: string;
}

@Component({
  selector: 'app-achievements',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './achievements.component.html',
  styles: []
})
export class AchievementsComponent {
  @Input() achievements: Achievement[] = [
    {
      id: 'first-drop',
      title: 'Primera Gota',
      description: 'Completa tu primera sesión',
      icon: '💧',
      unlocked: true,
      color: 'cyan'
    },
    {
      id: 'hydration-hero',
      title: 'Héroe de Hidratación',
      description: 'Completa 10 sesiones',
      icon: '🌊',
      unlocked: false,
      progress: 1,
      maxProgress: 10,
      color: 'blue'
    },
    {
      id: 'focus-master',
      title: 'Maestro del Enfoque',
      description: 'Completa 50 sesiones',
      icon: '🎯',
      unlocked: false,
      progress: 1,
      maxProgress: 50,
      color: 'purple'
    },
    {
      id: 'weekly-warrior',
      title: 'Guerrero Semanal',
      description: 'Racha de 7 días',
      icon: '🔥',
      unlocked: false,
      progress: 1,
      maxProgress: 7,
      color: 'orange'
    },
    {
      id: 'marathon-runner',
      title: 'Corredor de Maratón',
      description: '10 horas de tiempo enfocado',
      icon: '⏰',
      unlocked: false,
      progress: 0,
      maxProgress: 10,
      color: 'purple'
    },
    {
      id: 'consistency-king',
      title: 'Rey de la Consistencia',
      description: 'Racha de 30 días',
      icon: '👑',
      unlocked: false,
      progress: 1,
      maxProgress: 30,
      color: 'yellow'
    },
    {
      id: 'organizer',
      title: 'Organizador',
      description: 'Completa 25 tareas',
      icon: '📋',
      unlocked: false,
      progress: 0,
      maxProgress: 25,
      color: 'green'
    },
    {
      id: 'perfectionist',
      title: 'Perfeccionista',
      description: 'Logra 5 días perfectos',
      icon: '✨',
      unlocked: false,
      progress: 0,
      maxProgress: 5,
      color: 'yellow'
    }
  ];

  get unlockedAchievements(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }

  get achievementPercentage(): number {
    return Math.round((this.unlockedAchievements / this.achievements.length) * 100);
  }
}
