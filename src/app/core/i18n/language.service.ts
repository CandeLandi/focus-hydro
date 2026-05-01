import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type AppLanguage = 'es' | 'en';

@Injectable({ providedIn: 'root' })
export class LanguageService {
  private readonly STORAGE_KEY = 'hydrofocus-language';
  private readonly supported: AppLanguage[] = ['es', 'en'];
  private readonly fallbackLanguage: AppLanguage = 'es';

  private documentRef = inject(DOCUMENT);
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
    const preferred = this.getSavedLanguage() ?? this.detectBrowserLanguage() ?? this.fallbackLanguage;
    this.applyLanguage(preferred, false);
  }

  setLanguage(language: AppLanguage, syncUrl = false): void {
    void syncUrl;
    this.applyLanguage(language, true);
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
    const lang = (navigator.languages?.[0] ?? navigator.language).toLowerCase();
    return lang.startsWith('en') ? 'en' : 'es';
  }
}

