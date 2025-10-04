import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface WaterBottleProps {
  progress: number;
  isBreak: boolean;
}

@Component({
  selector: 'app-water-bottle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './water-bottle.component.html',
  styles: [`
    @keyframes wave {
      0%, 100% { transform: translateX(0) scaleY(1); }
      50% { transform: translateX(10px) scaleY(1.1); }
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
    }

    .animate-wave {
      animation: wave 3s ease-in-out infinite;
    }

    .animate-float {
      animation: float 4s ease-in-out infinite;
    }
  `]
})
export class WaterBottleComponent {
  @Input() progress: number = 0;
  @Input() isBreak: boolean = false;

  // Exponer Math para el template
  Math = Math;

  // Computed properties para el nivel de agua
  waterLevel = computed(() => {
    return this.isBreak ? Math.min(this.progress, 100) : Math.max(100 - this.progress, 0);
  });

  waterHeight = computed(() => {
    return (207 * this.waterLevel()) / 100;
  });

  waterY = computed(() => {
    return 94 + 207 - this.waterHeight();
  });

  // Métodos para verificar si mostrar elementos
  shouldShowWaves = computed(() => this.waterLevel() > 3);
  shouldShowBubbles = computed(() => this.waterLevel() > 10 && this.waterHeight() > 40);
  shouldShowMoreBubbles = computed(() => this.waterHeight() > 80);
}
