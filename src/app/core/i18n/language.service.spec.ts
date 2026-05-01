import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from './language.service';

class TranslateServiceMock {
  addLangs = jasmine.createSpy('addLangs');
  setDefaultLang = jasmine.createSpy('setDefaultLang');
  instant = jasmine.createSpy('instant').and.callFake((key: string) => key);
  use = jasmine.createSpy('use').and.returnValue(of({}));
}

describe('LanguageService', () => {
  let translate: TranslateServiceMock;
  let documentRef: Document;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [{ provide: TranslateService, useClass: TranslateServiceMock }]
    });
    translate = TestBed.inject(TranslateService) as unknown as TranslateServiceMock;
    documentRef = TestBed.inject(DOCUMENT);
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('registers supported languages and defaults to Spanish', () => {
    const service = TestBed.inject(LanguageService);

    expect(translate.addLangs).toHaveBeenCalledWith(['es', 'en']);
    expect(translate.setDefaultLang).toHaveBeenCalledWith('es');
    expect(service.currentLanguage()).toBe('es');
  });

  it('initializes from saved language without persisting again', () => {
    localStorage.setItem('hydrofocus-language', 'en');
    const service = TestBed.inject(LanguageService);

    service.initialize();

    expect(service.currentLanguage()).toBe('en');
    expect(documentRef.documentElement.lang).toBe('en');
    expect(localStorage.getItem('hydrofocus-language')).toBe('en');
  });

  it('persists explicit language changes and increments translation tick', () => {
    const service = TestBed.inject(LanguageService);
    const before = service.translationTick();

    service.setLanguage('en');

    expect(service.currentLanguage()).toBe('en');
    expect(service.translationTick()).toBe(before + 1);
    expect(localStorage.getItem('hydrofocus-language')).toBe('en');
  });

  it('still ticks when translate.use fails', () => {
    translate.use.and.returnValue(throwError(() => new Error('missing lang')));
    const service = TestBed.inject(LanguageService);
    const before = service.translationTick();

    service.setLanguage('en');

    expect(service.translationTick()).toBe(before + 1);
  });

  it('ignores unsupported route languages', () => {
    const service = TestBed.inject(LanguageService);

    service.setLanguageFromRoute('fr');

    expect(service.currentLanguage()).toBe('es');
    expect(translate.use).not.toHaveBeenCalled();
  });

  it('proxies instant translations', () => {
    const service = TestBed.inject(LanguageService);
    translate.instant.and.returnValue('translated');

    expect(service.translateInstant('key', { value: 1 })).toBe('translated');
  });
});
