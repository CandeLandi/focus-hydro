import { TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { LanguageService } from './core/i18n/language.service';
import { SeoI18nService } from './core/seo/seo-i18n.service';
import { MessageService } from 'primeng/api';

describe('AppComponent', () => {
  const languageMock = { initialize: jasmine.createSpy('initialize') };
  const seoMock = { init: jasmine.createSpy('init') };

  beforeEach(async () => {
    languageMock.initialize.calls.reset();
    seoMock.init.calls.reset();
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        MessageService,
        { provide: LanguageService, useValue: languageMock },
        { provide: SeoI18nService, useValue: seoMock }
      ]
    })
      .overrideComponent(AppComponent, { set: { template: '<router-outlet />' } })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('initializes language and SEO services on init', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();

    expect(languageMock.initialize).toHaveBeenCalled();
    expect(seoMock.init).toHaveBeenCalled();
  });
});
