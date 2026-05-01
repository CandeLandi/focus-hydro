import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  ViewEncapsulation,
  inject,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CelebrationStats } from '../../shared/models/celebration.model';
import { ImageGeneratorService } from '../../core/services/image-generator.service';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-celebration-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TranslateModule],
  templateUrl: './celebration-dialog.component.html',
  styleUrl: './celebration-dialog.component.css',
  encapsulation: ViewEncapsulation.None
})
export class CelebrationDialogComponent implements OnInit {
  @Input() visible: boolean = false;
  @Input() stats!: CelebrationStats;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() closeDayRequest = new EventEmitter<void>();

  readonly isGeneratingImage = signal(false);

  private readonly imageGenerator = inject(ImageGeneratorService);

  ngOnInit(): void {
    if (!this.stats) {
      console.error('[FocusFlow] No se proporcionaron estadísticas para el diálogo de celebración');
    }
  }

  private resolveAchievementFilename(): string {
    return `focusflow-logro-${new Date().toISOString().split('T')[0]}.png`;
  }

  async onDownloadImage(): Promise<void> {
    if (!this.stats) return;
    this.isGeneratingImage.set(true);
    try {
      const imageUrl = await this.imageGenerator.generateLinkedInImage(this.stats);
      this.imageGenerator.downloadImage(imageUrl, this.resolveAchievementFilename());
    } catch (error) {
      console.error('[FocusFlow] Error al generar la imagen:', error);
    } finally {
      this.isGeneratingImage.set(false);
    }
  }

  onClose(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }

  onCloseDay(): void {
    this.closeDayRequest.emit();
  }
}
