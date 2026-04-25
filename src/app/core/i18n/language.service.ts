import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'hydrofocus-language';
  private readonly supported: AppLanguage[] = ['es', 'en'];
  private readonly fallbackLanguage: AppLanguage = 'es';

  private documentRef = inject(DOCUMENT);
  private router = inject(Router);
  private translate = inject(TranslateService);

  currentLanguage = signal<AppLanguage>(this.fallbackLanguage);

  /**
   * Se incrementa cuando termina de cargarse el JSON del idioma activo.
   * Usalo como dependencia en `computed()` que usan `translate.instant()` para que
   * se recalculen cuando las traducciones estén listas (el pipe `translate` ya reacciona solo).
   */
  translationTick = signal(0);

  constructor() {
    this.translate.addLangs(this.supported);
    this.translate.setDefaultLang(this.fallbackLanguage);
  }

  initialize(): void {
    const urlLang = this.extractLanguageFromUrl(this.router.url);
    const preferred = this.getSavedLanguage() ?? this.detectBrowserLanguage() ?? this.fallbackLanguage;
    const initial = urlLang ?? preferred;
    this.applyLanguage(initial, false);
    if (!urlLang) {
      this.router.navigateByUrl(`/${initial}`, { replaceUrl: true });
    }
  }

  setLanguage(language: AppLanguage, syncUrl = true): void {
    this.applyLanguage(language, true);
    if (syncUrl) {
      this.syncRouteWithLanguage(language);
    }
  }

  setLanguageFromRoute(language: string): void {
    if (!this.isSupported(language)) return;
    this.applyLanguage(language, true);
  }

  isSupported(language: string | null | undefined): language is AppLanguage {
    return !!language && this.supported.includes(language as AppLanguage);
  }

  translateInstant(key: string, params?: Record<string, unknown>): string {
    return this.translate.instant(key, params);
  }

  private applyLanguage(language: AppLanguage, persist: boolean): void {
    this.currentLanguage.set(language);
    this.translate.use(language).subscribe({
      next: () => this.translationTick.update((n) => n + 1),
      error: () => this.translationTick.update((n) => n + 1)
    });
    this.documentRef.documentElement.lang = language;
    if (persist) {
      localStorage.setItem(this.STORAGE_KEY, language);
    }
  }

  private getSavedLanguage(): AppLanguage | null {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      return this.isSupported(saved) ? saved : null;
    } catch {
      return null;
    }
  }

  private detectBrowserLanguage(): AppLanguage | null {
    if (typeof navigator === 'undefined') return null;
    const lang = navigator.language.toLowerCase();
    return lang.startsWith('en') ? 'en' : 'es';
  }

  private extractLanguageFromUrl(url: string): AppLanguage | null {
    const first = url.split('?')[0].split('/').filter(Boolean)[0];
    return this.isSupported(first) ? first : null;
  }

  private syncRouteWithLanguage(language: AppLanguage): void {
    const tree = this.router.parseUrl(this.router.url);
    const segments = [...tree.root.children['primary']?.segments.map(s => s.path) ?? []];
    if (segments.length === 0) {
      this.router.navigateByUrl(`/${language}`);
      return;
    }
    if (this.isSupported(segments[0])) {
      segments[0] = language;
    } else {
      segments.unshift(language);
    }
    this.router.navigate(['/', ...segments], { queryParams: tree.queryParams });
  }
}

