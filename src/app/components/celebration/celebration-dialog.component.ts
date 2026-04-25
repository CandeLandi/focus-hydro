import { Component, Input, Output, EventEmitter, OnInit, ViewEncapsulation } from '@angular/core';
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

  isGeneratingImage = false;

  constructor(private imageGenerator: ImageGeneratorService) {}

  ngOnInit(): void {
    // Validar que las estadísticas estén presentes
    if (!this.stats) {
      console.error('[Focus and Hydrate] No se proporcionaron estadísticas para el diálogo de celebración');
    }
  }

  async onDownloadImage(): Promise<void> {
    if (!this.stats) return;
    this.isGeneratingImage = true;
    try {
      const imageUrl = await this.imageGenerator.generateLinkedInImage(this.stats);
      const filename = `focus-and-hydrate-logro-${new Date().toISOString().split('T')[0]}.png`;
      this.imageGenerator.downloadImage(imageUrl, filename);
    } catch (error) {
      console.error('[Focus and Hydrate] Error al generar la imagen:', error);
    } finally {
      this.isGeneratingImage = false;
    }
  }

  async onShareLinkedIn(): Promise<void> {
    if (!this.stats) return;
    this.isGeneratingImage = true;
    try {
      const imageUrl = await this.imageGenerator.generateLinkedInImage(this.stats);
      const filename = `focus-and-hydrate-logro-${new Date().toISOString().split('T')[0]}.png`;
      this.imageGenerator.downloadImage(imageUrl, filename);
      const text = this.imageGenerator.getSuggestedPostText(this.stats);
      await navigator.clipboard.writeText(text);
      window.open('https://www.linkedin.com/feed/', '_blank', 'noopener,noreferrer');
    } catch (error) {
      console.error('[Focus and Hydrate] Error al compartir:', error);
    } finally {
      this.isGeneratingImage = false;
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



