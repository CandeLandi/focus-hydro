import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { Injectable, PLATFORM_ID, inject } from '@angular/core';

type TabMode = 'focus' | 'break' | 'idle';

export interface BrowserTabProgressState {
  mode: TabMode;
  remainingSeconds: number;
  totalSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class BrowserTabProgressService {
  private readonly documentRef = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);
  private readonly canvasSize = 64;

  private readonly defaultTitle = this.isBrowser ? this.documentRef.title : 'HydroFocus';
  private defaultIconHref: string | null = null;
  private defaultIconType: string | null = null;
  private dynamicIconLink: HTMLLinkElement | null = null;
  private lastSignature = '';

  update(state: BrowserTabProgressState): void {
    if (!this.isBrowser) return;

    if (state.mode === 'idle') {
      this.restoreDefaults();
      return;
    }

    const total = Math.max(1, Math.floor(state.totalSeconds));
    const remaining = Math.min(total, Math.max(0, Math.floor(state.remainingSeconds)));
    const progress = Math.min(1, Math.max(0, 1 - remaining / total));
    const signature = `${state.mode}|${remaining}|${total}`;
    if (signature === this.lastSignature) return;
    this.lastSignature = signature;

    this.ensureDynamicIconLink();
    this.updateTitle(state.mode, remaining);
    this.updateDynamicFavicon(progress, state.mode);
  }

  restoreDefaults(): void {
    if (!this.isBrowser) return;
    this.lastSignature = '';
    this.documentRef.title = this.defaultTitle;
    this.captureDefaultIconHrefIfNeeded();
    if (this.dynamicIconLink?.parentNode) {
      this.dynamicIconLink.parentNode.removeChild(this.dynamicIconLink);
    }
    this.dynamicIconLink = null;
    this.forceDefaultIconRefresh();
  }

  private ensureDynamicIconLink(): void {
    if (this.dynamicIconLink) return;
    this.captureDefaultIconHrefIfNeeded();

    const link = this.documentRef.createElement('link');
    link.rel = 'icon';
    link.type = 'image/png';
    link.setAttribute('data-hydrofocus-dynamic-icon', 'true');
    if (this.defaultIconHref) {
      link.href = this.defaultIconHref;
    }
    this.documentRef.head.appendChild(link);
    this.dynamicIconLink = link;
  }

  private captureDefaultIconHrefIfNeeded(): void {
    if (this.defaultIconHref) return;
    const links = this.documentRef.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]');
    if (links.length > 0) {
      this.defaultIconHref = links[0].href;
      this.defaultIconType = links[0].type || null;
      return;
    }
    this.defaultIconHref = '/favicon.ico';
    this.defaultIconType = 'image/x-icon';
  }

  private forceDefaultIconRefresh(): void {
    if (!this.defaultIconHref) return;
    const fallback = this.documentRef.createElement('link');
    fallback.rel = 'icon';
    fallback.href = this.defaultIconHref;
    if (this.defaultIconType) {
      fallback.type = this.defaultIconType;
    }
    fallback.setAttribute('data-hydrofocus-default-refresh', 'true');
    this.documentRef.head.appendChild(fallback);
    setTimeout(() => fallback.remove(), 0);
  }

  private updateTitle(mode: Exclude<TabMode, 'idle'>, remainingSeconds: number): void {
    const label = mode === 'focus' ? 'Foco' : 'Descanso';
    this.documentRef.title = `${this.formatTime(remainingSeconds)} • ${label} | HydroFocus`;
  }

  private updateDynamicFavicon(progress: number, mode: Exclude<TabMode, 'idle'>): void {
    if (!this.dynamicIconLink) return;
    const canvas = this.documentRef.createElement('canvas');
    canvas.width = this.canvasSize;
    canvas.height = this.canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const center = this.canvasSize / 2;
    const radius = 22;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * progress;

    // Base dark circle
    ctx.fillStyle = '#070f23';
    ctx.beginPath();
    ctx.arc(center, center, 30, 0, Math.PI * 2);
    ctx.fill();

    // Track ring
    ctx.strokeStyle = 'rgba(148, 163, 184, 0.38)';
    ctx.lineWidth = 5.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.stroke();

    // Progress ring
    const gradient = ctx.createLinearGradient(8, 8, 56, 56);
    if (mode === 'focus') {
      gradient.addColorStop(0, '#6CEAFF');
      gradient.addColorStop(1, '#2A7CFF');
    } else {
      gradient.addColorStop(0, '#65F5D4');
      gradient.addColorStop(1, '#2FC8F6');
    }
    ctx.strokeStyle = gradient;
    ctx.shadowColor = mode === 'focus' ? 'rgba(45, 212, 255, 0.55)' : 'rgba(52, 211, 153, 0.5)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Inner subtle core for better readability at 16px
    ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
    ctx.beginPath();
    ctx.arc(center, center, 14, 0, Math.PI * 2);
    ctx.fill();

    this.dynamicIconLink.href = canvas.toDataURL('image/png');
  }

  private formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
}

