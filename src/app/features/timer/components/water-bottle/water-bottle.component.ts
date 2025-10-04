import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-water-bottle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './water-bottle.component.html',
  styles: []
})
export class WaterBottleComponent {
  @Input() waterLevel: number = 100;
  @Input() timeRemaining: number = 1500; // 25 minutos en segundos
  @Input() currentMode: 'focus' | 'break' = 'focus';
  @Input() sessionCount: number = 1;
  @Input() isRunning: boolean = false;

  formatTime(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}
