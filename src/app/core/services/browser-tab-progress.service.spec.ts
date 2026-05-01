import { DOCUMENT } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../i18n/language.service';
import { BrowserTabProgressService } from './browser-tab-progress.service';

class TranslateServiceMock {
  instant(key: string): string {
    const values: Record<string, string> = {
      'browserTab.focus': 'Foco',
      'browserTab.break': 'Descanso',
      'browserTab.paused': 'Pausado'
    };
    return values[key] ?? key;
  }
}

describe('BrowserTabProgressService', () => {
  let service: BrowserTabProgressService;
  let documentRef: Document;
  let originalTitle: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: TranslateService, useClass: TranslateServiceMock },
        {
          provide: LanguageService,
          useValue: {
            currentLanguage: signal('es'),
            translationTick: signal(0)
          }
        }
      ]
    });
    service = TestBed.inject(BrowserTabProgressService);
    documentRef = TestBed.inject(DOCUMENT);
    originalTitle = documentRef.title;
  });

  afterEach(() => {
    service.restoreDefaults();
    documentRef.title = originalTitle;
    documentRef.querySelectorAll('link[data-hydrofocus-dynamic-icon="true"]').forEach(el => el.remove());
  });

  it('updates browser title with focus state', () => {
    service.update({ mode: 'focus', remainingSeconds: 24 * 60 + 8, totalSeconds: 25 * 60, dailySessions: 3, isRunning: true });
    expect(documentRef.title).toBe('24:08 • Foco | 🔥 3');
  });

  it('creates dynamic icon link when running', () => {
    service.update({ mode: 'break', remainingSeconds: 60, totalSeconds: 300, dailySessions: 2, isRunning: true });
    const dynamic = documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]') as HTMLLinkElement | null;
    expect(dynamic).toBeTruthy();
    expect(dynamic?.href).toContain('data:image/png');
  });

  it('uses paused title and zero progress while paused', () => {
    service.update({ mode: 'paused', remainingSeconds: 90, totalSeconds: 300, dailySessions: 2, isRunning: false });

    expect(documentRef.title).toBe('⏸ Pausado • 01:30 | 🔥 2');
    expect(documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]')).toBeTruthy();
  });

  it('updates title for break state', () => {
    service.update({ mode: 'break', remainingSeconds: 62, totalSeconds: 300, dailySessions: 3, isRunning: true });

    expect(documentRef.title).toBe('01:02 • Descanso | 🔥 3');
  });

  it('restores defaults when mode is idle', () => {
    service.update({ mode: 'focus', remainingSeconds: 120, totalSeconds: 1500, dailySessions: 1, isRunning: true });
    expect(documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]')).toBeTruthy();

    service.update({ mode: 'idle', remainingSeconds: 0, totalSeconds: 0, dailySessions: 0, isRunning: false });
    expect(documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]')).toBeNull();
    expect(documentRef.title).toBe(originalTitle);
  });

  it('temporarily overrides title and then returns to base', () => {
    jasmine.clock().install();
    try {
      service.update({ mode: 'focus', remainingSeconds: 1200, totalSeconds: 1500, dailySessions: 4, isRunning: true });
      service.showTemporaryTitle('Último minuto • Foco', 1000);
      service.update({ mode: 'focus', remainingSeconds: 1199, totalSeconds: 1500, dailySessions: 4, isRunning: true });
      expect(documentRef.title).toBe('Último minuto • Foco');

      jasmine.clock().tick(1000);
      service.update({ mode: 'focus', remainingSeconds: 1198, totalSeconds: 1500, dailySessions: 4, isRunning: true });
      expect(documentRef.title).toBe('19:58 • Foco | 🔥 4');
    } finally {
      jasmine.clock().uninstall();
    }
  });
});

