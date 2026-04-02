import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { BrowserTabProgressService } from './browser-tab-progress.service';

describe('BrowserTabProgressService', () => {
  let service: BrowserTabProgressService;
  let documentRef: Document;
  let originalTitle: string;

  beforeEach(() => {
    TestBed.configureTestingModule({});
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
    service.update({ mode: 'focus', remainingSeconds: 24 * 60 + 8, totalSeconds: 25 * 60 });
    expect(documentRef.title).toBe('24:08 • Foco | HydroFocus');
  });

  it('creates dynamic icon link when running', () => {
    service.update({ mode: 'break', remainingSeconds: 60, totalSeconds: 300 });
    const dynamic = documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]') as HTMLLinkElement | null;
    expect(dynamic).toBeTruthy();
    expect(dynamic?.href).toContain('data:image/png');
  });

  it('restores defaults when mode is idle', () => {
    service.update({ mode: 'focus', remainingSeconds: 120, totalSeconds: 1500 });
    expect(documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]')).toBeTruthy();

    service.update({ mode: 'idle', remainingSeconds: 0, totalSeconds: 0 });
    expect(documentRef.querySelector('link[data-hydrofocus-dynamic-icon="true"]')).toBeNull();
    expect(documentRef.title).toBe(originalTitle);
  });
});

