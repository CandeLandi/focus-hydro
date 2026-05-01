import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { signal } from '@angular/core';
import { LanguageService } from '../i18n/language.service';
import { SeoI18nService } from './seo-i18n.service';

describe('SeoI18nService', () => {
  let service: SeoI18nService;
  let title: Title;
  let meta: Meta;
  let documentRef: Document;
  const routerEvents = new Subject<NavigationEnd>();
  const routerMock = {
    url: '/',
    events: routerEvents.asObservable()
  };
  const languageMock = {
    currentLanguage: signal<'es' | 'en'>('es')
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        Title,
        Meta,
        { provide: Router, useValue: routerMock },
        { provide: LanguageService, useValue: languageMock }
      ]
    });
    service = TestBed.inject(SeoI18nService);
    title = TestBed.inject(Title);
    meta = TestBed.inject(Meta);
    documentRef = TestBed.inject(DOCUMENT);
    routerMock.url = '/';
    languageMock.currentLanguage.set('es');
  });

  afterEach(() => {
    ['canonical', 'alternate-es', 'alternate-en', 'alternate-x-default'].forEach(id => documentRef.getElementById(id)?.remove());
  });

  it('writes Spanish SEO metadata and canonical links on init', () => {
    service.init();

    expect(title.getTitle()).toContain('Productividad');
    expect(meta.getTag('name="description"')?.content).toContain('Pomodoro');
    expect(meta.getTag('property="og:locale"')?.content).toBe('es_ES');
    expect(documentRef.documentElement.lang).toBe('es');
    expect((documentRef.getElementById('canonical') as HTMLLinkElement).href).toContain('/');
    expect((documentRef.getElementById('alternate-en') as HTMLLinkElement).hreflang).toBe('en');
  });

  it('updates metadata after navigation using the current language', () => {
    service.init();
    languageMock.currentLanguage.set('en');
    routerMock.url = '/dashboard?x=1';

    routerEvents.next(new NavigationEnd(1, '/dashboard', '/dashboard'));

    expect(title.getTitle()).toContain('Productivity');
    expect(meta.getTag('property="og:locale"')?.content).toBe('en_US');
    expect(meta.getTag('property="og:locale:alternate"')?.content).toBe('es_ES');
  });
});
