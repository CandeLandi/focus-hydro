import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CelebrationStats } from '../../shared/models/celebration.model';

/** Copy for the downloadable share image; driven by `shareCard.*` i18n keys (plus computed attribution). */
interface ShareCardCopy {
  readonly hashtag: string;
  /** Full line “Progress by Name”; empty hides the line */
  readonly attributionLine: string;
  readonly titleObjective: string;
  readonly titleDone: string;
  readonly subtitlePart1: string;
  readonly subtitlePart2: string;
  readonly statsTasksSingular: string;
  readonly statsTasksPlural: string;
  readonly statsFocus: string;
  readonly statsProgress: string;
  readonly hydrationLead: string;
  readonly hydrationHighlight: string;
  readonly hydrationTagline: string;
  readonly footerTagline: string;
}

/** Share-card palette aligned with FocusFlow cyan → purple neon look. */
const COL = {
  bgTop: '#050a14',
  bgMid: '#070f1f',
  bgBot: '#040812',
  cyan: '#22d3ee',
  cyanBright: '#5cefff',
  purple: '#c084fc',
  white: '#f8fafc',
  muted: 'rgba(186, 210, 238, 0.72)',
  muted2: 'rgba(148, 176, 210, 0.52)',
  stroke: 'rgba(255,255,255,0.06)'
} as const;

const W = 1200;
const H = 1200;

/** Vertical rhythm: header → hero → title → subtitle/attribution → stats → hydration → footer */
const L = {
  marginX: 64,
  heroCy: 205,
  heroROuter: 108,
  heroRInner: 78,
  gapHeroToTitle: 56,
  titleFont: '800 72px Inter, system-ui, -apple-system, sans-serif',
  gapTitleToSubtitle: 38,
  subtitleFont: '500 29px Inter, system-ui, -apple-system, sans-serif',
  gapSubtitleToAttribution: 30,
  attributionFont: '500 19px Inter, system-ui, -apple-system, sans-serif',
  gapAttributionBlockToStats: 46,
  cardH: 184,
  cardRadius: 18,
  gapStatsToHydration: 42,
  hydrationBlockH: 92,
  hydrationFont: '500 29px Inter, system-ui, -apple-system, sans-serif',
  footerMinTop: 878,
  footerCanvasBottomPad: 64
};

@Injectable({
  providedIn: 'root'
})
export class ImageGeneratorService {
  private readonly translate = inject(TranslateService);

  async generateLinkedInImage(stats: CelebrationStats): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('[FocusFlow] No se pudo obtener el contexto del canvas');
    }

    canvas.width = W;
    canvas.height = H;

    const copy = this.buildShareCardCopy(stats);

    this.drawBackground(ctx, W, H);
    this.drawHashtag(ctx, copy.hashtag);

    const heroBottom = this.drawHeroSuccessRing(ctx);
    const titleBaseline = heroBottom + L.gapHeroToTitle;
    let y = this.drawTitleBlock(ctx, stats, titleBaseline, copy);
    y += L.gapAttributionBlockToStats;

    const afterCard = this.drawStatsCard(ctx, stats, y, copy);
    const hydrationBottom = this.drawHydrationMessageCentered(ctx, afterCard + L.gapStatsToHydration, copy);

    await this.drawFooterBelowContent(ctx, copy, hydrationBottom + 54);

    return canvas.toDataURL('image/png');
  }

  private tc(sub: string): string {
    return this.translate.instant(`shareCard.${sub}`) as string;
  }

  private buildShareCardCopy(stats: CelebrationStats): ShareCardCopy {
    return {
      hashtag: this.tc('hashtag'),
      attributionLine: this.buildAttributionLine(stats),
      titleObjective: this.tc('titleObjective'),
      titleDone: this.tc('titleDone'),
      subtitlePart1: this.tc('subtitlePart1'),
      subtitlePart2: this.tc('subtitlePart2'),
      statsTasksSingular: this.tc('statsTasksSingular'),
      statsTasksPlural: this.tc('statsTasksPlural'),
      statsFocus: this.tc('statsFocus'),
      statsProgress: this.tc('statsProgress'),
      hydrationLead: this.tc('hydrationLead'),
      hydrationHighlight: this.tc('hydrationHighlight'),
      hydrationTagline: this.tc('hydrationTagline'),
      footerTagline: this.tc('footerTagline')
    };
  }

  /** Single localized line or empty → hidden */
  private buildAttributionLine(stats: CelebrationStats): string {
    const raw = stats.displayName?.trim() ?? '';
    if (!this.isDisplayNameEligible(raw)) {
      return '';
    }
    return this.translate.instant('shareCard.progressBy', { name: raw }) as string;
  }

  private isDisplayNameEligible(s: string): boolean {
    if (s.length < 2 || s.length > 56) return false;
    const lower = s.toLowerCase();
    if (['undefined', 'null', 'anonymous', 'user', 'usuario', 'test'].includes(lower)) return false;
    return /[a-zA-ZÀ-ÿ\u00f1\u00d1]/.test(s);
  }

  downloadImage(dataUrl: string, filename: string = 'focusflow-logro.png'): void {
    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  }

  private drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const g = ctx.createLinearGradient(0, 0, 0, height);
    g.addColorStop(0, COL.bgTop);
    g.addColorStop(0.45, COL.bgMid);
    g.addColorStop(1, COL.bgBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);

    const halo = ctx.createRadialGradient(width / 2, height * 0.18, 0, width / 2, height * 0.18, width * 0.5);
    halo.addColorStop(0, 'rgba(34, 211, 238, 0.045)');
    halo.addColorStop(0.55, 'rgba(192, 132, 252, 0.035)');
    halo.addColorStop(1, 'rgba(5,10,20,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, width, height * 0.5);
  }

  private drawHashtag(ctx: CanvasRenderingContext2D, hashtag: string): void {
    ctx.save();
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.font = '600 20px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = COL.cyanBright;
    ctx.shadowColor = 'rgba(34, 211, 238, 0.22)';
    ctx.shadowBlur = 8;
    ctx.fillText(hashtag, W - L.marginX, 68);
    ctx.restore();
  }

  /** Ring + check; sparkles restricted to upper arc (quieter). Returns Y of hero bottom rim + padding (no overlap with title zone). */
  private drawHeroSuccessRing(ctx: CanvasRenderingContext2D): number {
    const cx = W / 2;
    const cy = L.heroCy;
    const rOuter = L.heroROuter;
    const rInner = L.heroRInner;

    const sparkleCount = 4;
    for (let i = 0; i < sparkleCount; i++) {
      const t = i / (sparkleCount - 1);
      const a = -Math.PI * 1.05 + t * Math.PI * 0.65;
      const rr = rOuter + 30 + ((i * 13) % 16);
      this.drawSparkle(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 5 + (i % 3), 'rgba(34,211,238,0.32)');
    }

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rOuter + 22, 0, Math.PI * 2);
    const glow = ctx.createRadialGradient(cx, cy, rOuter - 36, cx, cy, rOuter + 42);
    glow.addColorStop(0, 'rgba(34, 211, 238, 0)');
    glow.addColorStop(0.55, 'rgba(34, 211, 238, 0.045)');
    glow.addColorStop(1, 'rgba(192, 132, 252, 0.04)');
    ctx.fillStyle = glow;
    ctx.fill();

    const ringGrad = ctx.createLinearGradient(cx - rOuter, cy - rOuter, cx + rOuter, cy + rOuter);
    ringGrad.addColorStop(0, COL.cyanBright);
    ringGrad.addColorStop(0.55, COL.cyan);
    ringGrad.addColorStop(1, COL.purple);

    ctx.beginPath();
    ctx.arc(cx, cy, rOuter, 0, Math.PI * 2);
    ctx.strokeStyle = ringGrad;
    ctx.lineWidth = 7;
    ctx.shadowColor = 'rgba(34, 211, 238, 0.14)';
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.arc(cx, cy, rInner, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(8, 16, 32, 0.94)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy + 4);
    ctx.lineTo(cx - 14, cy + 34);
    ctx.lineTo(cx + 50, cy - 32);
    const chk = ctx.createLinearGradient(cx - 42, cy, cx + 54, cy);
    chk.addColorStop(0, COL.cyan);
    chk.addColorStop(0.65, '#a5f3fc');
    chk.addColorStop(1, 'rgba(248,250,252,0.92)');
    ctx.strokeStyle = chk;
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.restore();

    const ringBottom = cy + rOuter;
    return ringBottom + 16;
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.moveTo(0, -size);
    ctx.lineTo(size * 0.28, -size * 0.28);
    ctx.lineTo(size, 0);
    ctx.lineTo(size * 0.28, size * 0.28);
    ctx.lineTo(0, size);
    ctx.lineTo(-size * 0.28, size * 0.28);
    ctx.lineTo(-size, 0);
    ctx.lineTo(-size * 0.28, -size * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Title, subtitle, optional attribution row. Returns bottom Y below this block (+ trailing gap before stats caller adds). */
  private drawTitleBlock(
    ctx: CanvasRenderingContext2D,
    _stats: CelebrationStats,
    titleBaselineY: number,
    copy: ShareCardCopy
  ): number {
    const cx = W / 2;
    ctx.textBaseline = 'alphabetic';
    ctx.font = L.titleFont;
    ctx.textAlign = 'left';

    const partA = copy.titleObjective;
    const partB = copy.titleDone;
    const wA = ctx.measureText(partA).width;
    const wB = ctx.measureText(partB).width;
    const pairW = wA + wB;
    let x = cx - pairW / 2;

    ctx.shadowBlur = 0;
    ctx.fillStyle = COL.white;
    ctx.fillText(partA, x, titleBaselineY);
    x += wA;

    const grad = ctx.createLinearGradient(x, titleBaselineY - 48, x + wB, titleBaselineY + 8);
    grad.addColorStop(0, '#7dd3fc');
    grad.addColorStop(0.55, COL.cyan);
    grad.addColorStop(1, '#b794f6');
    ctx.fillStyle = grad;
    ctx.fillText(partB, x, titleBaselineY);

    const subBaseline = titleBaselineY + L.gapTitleToSubtitle;
    ctx.font = L.subtitleFont;
    const s1 = copy.subtitlePart1;
    const s2 = copy.subtitlePart2;
    const wS1 = ctx.measureText(s1).width;
    const wS2 = ctx.measureText(s2).width;
    let sx = cx - (wS1 + wS2) / 2;

    ctx.fillStyle = COL.muted;
    ctx.fillText(s1, sx, subBaseline);
    sx += wS1;
    ctx.fillStyle = COL.cyanBright;
    ctx.fillText(s2, sx, subBaseline);

    let nextY = subBaseline;
    if (copy.attributionLine) {
      const attrBaseline = subBaseline + L.gapSubtitleToAttribution;
      ctx.textAlign = 'center';
      ctx.font = L.attributionFont;
      ctx.fillStyle = COL.muted2;
      ctx.fillText(copy.attributionLine, cx, attrBaseline);
      nextY = attrBaseline;
    }

    return nextY + 18;
  }

  private roundedRectStrokeFill(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    rw: number,
    rh: number,
    r: number,
    fill: string | CanvasGradient | CanvasPattern,
    stroke: string,
    lineW: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(rx + r, ry);
    ctx.lineTo(rx + rw - r, ry);
    ctx.arcTo(rx + rw, ry, rx + rw, ry + r, r);
    ctx.lineTo(rx + rw, ry + rh - r);
    ctx.arcTo(rx + rw, ry + rh, rx + rw - r, ry + rh, r);
    ctx.lineTo(rx + r, ry + rh);
    ctx.arcTo(rx, ry + rh, rx, ry + rh - r, r);
    ctx.lineTo(rx, ry + r);
    ctx.arcTo(rx, ry, rx + r, ry, r);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineW;
    ctx.stroke();
  }

  private drawStatsCard(ctx: CanvasRenderingContext2D, stats: CelebrationStats, topY: number, copy: ShareCardCopy): number {
    const pad = L.marginX;
    const cardW = W - pad * 2;
    const cardH = L.cardH;
    const x = pad;
    const y = topY;
    const rCard = L.cardRadius;

    this.roundedRectStrokeFill(
      ctx,
      x,
      y,
      cardW,
      cardH,
      rCard,
      'rgba(10, 18, 36, 0.42)',
      COL.stroke,
      1
    );

    const colW = cardW / 3;
    const mid1 = x + colW;
    const mid2 = x + colW * 2;
    ctx.strokeStyle = 'rgba(100,116,148,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(mid1, y + 28);
    ctx.lineTo(mid1, y + cardH - 28);
    ctx.moveTo(mid2, y + 28);
    ctx.lineTo(mid2, y + cardH - 28);
    ctx.stroke();

    const iconY = y + 52;

    const centres = [
      {
        xc: x + colW / 2,
        tasks: stats.tasksCompleted,
        label: stats.tasksCompleted === 1 ? copy.statsTasksSingular : copy.statsTasksPlural,
        drawIcon: (): void => this.drawTargetIcon(ctx, x + colW / 2, iconY)
      },
      {
        xc: x + colW + colW / 2,
        label: copy.statsFocus,
        drawIcon: (): void => this.drawClockIcon(ctx, x + colW + colW / 2, iconY)
      },
      {
        xc: x + colW * 2 + colW / 2,
        label: copy.statsProgress,
        drawIcon: (): void => this.drawTrendIcon(ctx, x + colW * 2 + colW / 2, iconY)
      }
    ];

    ctx.textAlign = 'center';
    centres.forEach((c) => {
      c.drawIcon();
    });

    const valueBaseline = y + 130;
    ctx.font = '800 58px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = COL.white;
    ctx.fillText(String(centres[0].tasks), centres[0].xc, valueBaseline);
    ctx.fillText(stats.totalFocusTime, centres[1].xc, valueBaseline);
    ctx.fillText(`${stats.completionPercentage}%`, centres[2].xc, valueBaseline);

    const labelBaseline = y + 160;
    ctx.font = '600 13px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = COL.muted2;
    ctx.letterSpacing = '0.04em';
    ctx.fillText(centres[0].label, centres[0].xc, labelBaseline);
    ctx.fillText(centres[1].label, centres[1].xc, labelBaseline);
    ctx.fillText(centres[2].label, centres[2].xc, labelBaseline);
    ctx.letterSpacing = '0';

    return y + cardH;
  }

  private drawTargetIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.save();
    const g = ctx.createLinearGradient(cx - 24, cy - 20, cx + 24, cy + 20);
    g.addColorStop(0, COL.cyan);
    g.addColorStop(1, COL.purple);
    ctx.strokeStyle = g;
    ctx.lineWidth = 2;
    for (let rr = 22; rr >= 8; rr -= 14) {
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawClockIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    ctx.strokeStyle = 'rgba(94,239,255,0.85)';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - 17);
    ctx.lineTo(cx + 10, cy - 2);
    ctx.stroke();
  }

  private drawTrendIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const g = ctx.createLinearGradient(cx - 32, cy, cx + 32, cy);
    g.addColorStop(0, COL.cyan);
    g.addColorStop(1, COL.purple);
    ctx.strokeStyle = g;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    const y0 = cy + 14;
    ctx.beginPath();
    ctx.moveTo(cx - 28, y0 + 2);
    ctx.lineTo(cx - 10, y0 - 15);
    ctx.lineTo(cx + 8, y0);
    ctx.lineTo(cx + 30, y0 - 26);
    ctx.stroke();
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(cx + 28, y0 - 26);
    ctx.lineTo(cx + 30, y0 - 16);
    ctx.lineTo(cx + 20, y0 - 21);
    ctx.closePath();
    ctx.fill();
  }

  private drawHydrationMessageCentered(ctx: CanvasRenderingContext2D, topY: number, copy: ShareCardCopy): number {
    const cx = W / 2;
    const blockW = 820;
    const blockH = L.hydrationBlockH;
    const blockX = cx - blockW / 2;
    const blockY = topY;

    this.roundedRectStrokeFill(
      ctx,
      blockX,
      blockY,
      blockW,
      blockH,
      16,
      'rgba(10, 18, 36, 0.34)',
      'rgba(255,255,255,0.055)',
      1
    );

    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = L.hydrationFont;

    const lead = copy.hydrationLead;
    const hi = copy.hydrationHighlight;
    const wLead = ctx.measureText(lead).width;
    const wHi = ctx.measureText(hi).width;
    const hasTagline = Boolean(copy.hydrationTagline?.trim());
    const midY = blockY + (hasTagline ? 38 : blockH / 2);

    ctx.shadowBlur = 0;
    let x = cx - (wLead + wHi) / 2;

    ctx.fillStyle = COL.muted;
    ctx.fillText(lead, x, midY);
    x += wLead;
    ctx.fillStyle = COL.cyan;
    ctx.fillText(hi, x, midY);

    const mainBottom = midY + 15;

    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';

    const tag = copy.hydrationTagline?.trim();
    if (!tag) {
      return blockY + blockH;
    }
    ctx.font = '600 13px Inter, system-ui, -apple-system, sans-serif';
    ctx.fillStyle = COL.muted2;
    ctx.textAlign = 'center';
    const tagBaseline = midY + 31;
    ctx.fillText(tag, cx, tagBaseline);
    ctx.textAlign = 'left';
    return Math.max(mainBottom, blockY + blockH);
  }

  /** Brand stack placed directly under main content so the canvas is not bottom-heavy. */
  private async drawFooterBelowContent(ctx: CanvasRenderingContext2D, copy: ShareCardCopy, preferredTop: number): Promise<void> {
    const cx = W / 2;
    const logoSize = 54;
    const gapLogoToBrandTextTop = 20;
    const brandFontPx = 34;
    const taglineFontPx = 15;
    const urlFontPx = 20;
    const gapBrandToTagline = 30;
    const gapTaglineToUrl = 34;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `750 ${brandFontPx}px Inter, system-ui, -apple-system, sans-serif`;

    const partFocus = 'Focus';
    const partFlow = 'Flow';
    const focusFlowGap = 10;
    const wFocus = ctx.measureText(partFocus).width;
    const wFlow = ctx.measureText(partFlow).width;

    const footerStackHeight =
      logoSize + gapLogoToBrandTextTop + brandFontPx + gapBrandToTagline + taglineFontPx + gapTaglineToUrl + urlFontPx;
    const maxLogoTop = H - L.footerCanvasBottomPad - footerStackHeight;
    const logoTop = Math.min(Math.max(preferredTop, L.footerMinTop), maxLogoTop);
    const brandBaseline = logoTop + logoSize + gapLogoToBrandTextTop + brandFontPx;
    const taglineBaseline = brandBaseline + gapBrandToTagline;
    const urlY = taglineBaseline + taglineFontPx + gapTaglineToUrl;

    try {
      const logo = await this.loadImage('/images/logo-hydrofocus.svg');
      ctx.drawImage(logo, cx - logoSize / 2, logoTop, logoSize, logoSize);
    } catch {
      this.drawSparkle(ctx, cx, logoTop + logoSize / 2, 10, 'rgba(34,211,238,0.35)');
    }

    const pairW = wFocus + focusFlowGap + wFlow;
    const pairLeft = cx - pairW / 2;

    ctx.fillStyle = COL.white;
    ctx.textAlign = 'left';
    ctx.fillText(partFocus, pairLeft, brandBaseline);

    const flowX = pairLeft + wFocus + focusFlowGap;
    const gFlow = ctx.createLinearGradient(flowX, brandBaseline - 24, flowX + 96, brandBaseline + 8);
    gFlow.addColorStop(0, COL.cyan);
    gFlow.addColorStop(1, COL.purple);
    ctx.fillStyle = gFlow;
    ctx.fillText(partFlow, flowX, brandBaseline);

    ctx.textAlign = 'center';
    ctx.font = `500 ${taglineFontPx}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(148, 176, 210, 0.72)';
    ctx.fillText(copy.footerTagline, cx, taglineBaseline);

    const url = 'focusflow-pomodoro.com';
    ctx.font = `600 ${urlFontPx}px Inter, system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = 'rgba(186, 210, 238, 0.88)';
    ctx.textBaseline = 'middle';
    ctx.fillText(url, cx, urlY);
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
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
