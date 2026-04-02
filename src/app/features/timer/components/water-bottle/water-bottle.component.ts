import { Component, input, computed } from '@angular/core';
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
  styleUrl: './water-bottle.component.css'
})
export class WaterBottleComponent {
  progress = input.required<number>();
  isBreak = input.required<boolean>();

  // Exponer Math para el template
  Math = Math;

  // Computed properties para el nivel de agua
  waterLevel = computed(() => {
    return this.isBreak() ? Math.min(this.progress(), 100) : Math.max(100 - this.progress(), 0);
  });

  waterHeight = computed(() => {
    return (207 * this.waterLevel()) / 100;
  });

  waterY = computed(() => {
    return 94 + 207 - this.waterHeight();
  });

  shouldShowWaves = computed(() => this.waterLevel() > 3);
  shouldShowBubbles = computed(() => this.waterLevel() > 10 && this.waterHeight() > 40);
  shouldShowMoreBubbles = computed(() => this.waterHeight() > 80);

  /** Organic wavy water surface path (curva suave) */
  waterSurfacePath = computed(() => {
    const y = this.waterY();
    const h = 5;
    return `M 49 ${y} Q 80 ${y - 2} 100 ${y} T 151 ${y} L 151 ${y + h} L 49 ${y + h} Z`;
  });

  /** Progress ring: circumference and offset */
  ringCircumference = 2 * Math.PI * 92;
  ringOffset = computed(() => {
    const p = this.isBreak() ? this.progress() : 100 - this.progress();
    return this.ringCircumference * (1 - Math.min(100, Math.max(0, p)) / 100);
  });
}
