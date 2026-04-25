import { Injectable } from '@angular/core';
import { CelebrationStats } from '../../shared/models/celebration.model';

@Injectable({
  providedIn: 'root'
})
export class ImageGeneratorService {
  async generateLinkedInImage(stats: CelebrationStats): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No se pudo obtener el contexto del canvas');
    }

    canvas.width = 1200;
    canvas.height = 1200;

    this.drawBackground(ctx, canvas.width, canvas.height);
    await this.drawHeroGraphic(ctx, canvas.width);
    this.drawHeaderTexts(ctx, canvas.width, stats);
    this.drawStats(ctx, canvas.width, stats);
    await this.drawBranding(ctx, canvas.width, canvas.height);

    return canvas.toDataURL('image/png');
  }

  downloadImage(dataUrl: string, filename: string = 'focus-and-hydrate-logro.png'): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  getSuggestedPostText(stats: CelebrationStats): string {
    const authorLine = stats.displayName ? `Soy ${stats.displayName} y hoy cerré mi objetivo diario en Focus and Hydrate.\n\n` : '';
    return (
      `¡Objetivo del día cumplido! 🎯\n\n` +
      authorLine +
      `✅ ${stats.tasksCompleted} tareas completadas\n` +
      `⏱️ ${stats.totalFocusTime} de enfoque con la Técnica Pomodoro\n` +
      `💧 Enfoque + hidratación = productividad sostenible\n\n` +
      `#Productividad #Pomodoro #Enfoque #FocusAndHydrate`
    );
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const bg = ctx.createLinearGradient(0, 0, 0, height);
    bg.addColorStop(0, '#060d1f');
    bg.addColorStop(1, '#08132a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const topHalo = ctx.createRadialGradient(width / 2, 120, 40, width / 2, 120, 420);
    topHalo.addColorStop(0, 'rgba(34, 211, 238, 0.2)');
    topHalo.addColorStop(1, 'rgba(34, 211, 238, 0)');
    ctx.fillStyle = topHalo;
    ctx.fillRect(0, 0, width, 480);

    ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, width - 60, height - 60);
  }

  private async drawHeroGraphic(ctx: CanvasRenderingContext2D, width: number): Promise<void> {
    const hero = await this.loadImage('/images/winners.png');
    const maxW = 360;
    const scale = Math.min(maxW / hero.width, 1);
    const drawW = hero.width * scale;
    const drawH = hero.height * scale;
    const x = (width - drawW) / 2;
    const y = 130;

    ctx.save();
    ctx.globalAlpha = 0.93;
    ctx.drawImage(hero, x, y, drawW, drawH);
    ctx.restore();
  }

  private drawHeaderTexts(ctx: CanvasRenderingContext2D, width: number, stats: CelebrationStats): void {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 64px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText('Objetivo cumplido', width / 2, 520);

    ctx.fillStyle = '#9fb0cb';
    ctx.font = '400 30px Inter, system-ui, -apple-system, sans-serif';
    const subtitle = stats.displayName ? `Resumen de productividad de ${stats.displayName}` : 'Resumen de productividad del día';
    ctx.fillText(subtitle, width / 2, 565);

    ctx.fillStyle = 'rgba(34, 211, 238, 0.92)';
    ctx.font = '500 30px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText(this.getMotivationalPhrase(stats.tasksCompleted), width / 2, 620);
  }

  private getMotivationalPhrase(seed: number): string {
    const phrases = [
      'Pequeños pasos, grandes logros.',
      'La constancia vence al talento.',
      'Enfoque + hidratación = mejor tú.',
      'Cada pomodoro te acerca a la meta.',
      'Productividad sostenible, no quemarte.'
    ];
    return phrases[seed % phrases.length];
  }

  private drawStats(ctx: CanvasRenderingContext2D, canvasWidth: number, stats: CelebrationStats): void {
    const statsY = 700;
    const statWidth = 300;
    const statHeight = 132;
    const spacing = 34;
    const totalWidth = statWidth * 3 + spacing * 2;
    const startX = (canvasWidth - totalWidth) / 2;

    const statsData = [
      { value: stats.tasksCompleted.toString(), label: 'Tareas Completadas', color: '#06b6d4' },
      { value: stats.totalFocusTime, label: 'Tiempo de Enfoque', color: '#34d399' },
      { value: `${stats.completionPercentage}%`, label: 'Progreso', color: '#a78bfa' }
    ];

    statsData.forEach((stat, index) => {
      const x = startX + (statWidth + spacing) * index;

      ctx.fillStyle = 'rgba(17, 28, 51, 0.68)';
      this.roundRect(ctx, x, statsY, statWidth, statHeight, 18);
      ctx.fill();

      ctx.strokeStyle = this.addAlpha(stat.color, 0.24);
      ctx.lineWidth = 1;
      this.roundRect(ctx, x, statsY, statWidth, statHeight, 18);
      ctx.stroke();

      ctx.fillStyle = stat.color;
      ctx.font = '700 58px Inter, system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(stat.value, x + statWidth / 2, statsY + 72);

      ctx.fillStyle = '#90a0bc';
      ctx.font = '500 20px Inter, system-ui, -apple-system, sans-serif';
      ctx.fillText(stat.label, x + statWidth / 2, statsY + 113);
    });
  }

  private addAlpha(color: string, alpha: number): string {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private async drawBranding(ctx: CanvasRenderingContext2D, width: number, height: number): Promise<void> {
    const brandingY = height - 168;
    const brandingWidth = 500;
    const brandingX = (width - brandingWidth) / 2;
    const brandingHeight = 92;

    ctx.fillStyle = 'rgba(17, 28, 51, 0.55)';
    this.roundRect(ctx, brandingX, brandingY, brandingWidth, brandingHeight, 14);
    ctx.fill();
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.14)';
    ctx.lineWidth = 1;
    this.roundRect(ctx, brandingX, brandingY, brandingWidth, brandingHeight, 14);
    ctx.stroke();

    const logoX = brandingX + 28;
    const logoY = brandingY + 12;
    const logoSize = 68;
    try {
      const logo = await this.loadImage('/images/logo-hydrofocus.png');
      ctx.save();
      ctx.globalAlpha = 0.98;
      ctx.drawImage(logo, logoX, logoY, logoSize, logoSize);
      ctx.restore();
    } catch (error) {
      console.error('[Focus and Hydrate] No se pudo cargar el logo para branding', error);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = '600 31px Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('Focus and Hydrate', logoX + 82, logoY + 32);

    ctx.fillStyle = '#7f95b8';
    ctx.font = '400 17px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillText('Pomodoro + Hidratación consciente', logoX + 82, logoY + 57);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 17px Inter, system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('focusandhydrate.com', width / 2, height - 40);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`));
      img.src = src;
    });
  }
}


