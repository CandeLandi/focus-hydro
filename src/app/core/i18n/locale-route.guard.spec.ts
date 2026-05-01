import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { LanguageService } from './language.service';
import { localeRouteGuard } from './locale-route.guard';

describe('localeRouteGuard', () => {
  const routerMock = {
    createUrlTree: jasmine.createSpy('createUrlTree').and.callFake((commands: unknown[]) => ({ commands }))
  };
  const languageMock = {
    isSupported: jasmine.createSpy('isSupported').and.callFake((lang: string | null | undefined) => lang === 'es' || lang === 'en'),
    setLanguageFromRoute: jasmine.createSpy('setLanguageFromRoute')
  };

  beforeEach(() => {
    routerMock.createUrlTree.calls.reset();
    languageMock.isSupported.calls.reset();
    languageMock.setLanguageFromRoute.calls.reset();
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerMock },
        { provide: LanguageService, useValue: languageMock }
      ]
    });
  });

  function runGuard(route: Partial<ActivatedRouteSnapshot>): unknown {
    return TestBed.runInInjectionContext(() => localeRouteGuard(route as ActivatedRouteSnapshot, {} as never));
  }

  it('applies supported language from route config and redirects to root', () => {
    const result = runGuard({ paramMap: convertToParamMap({}), routeConfig: { path: 'en' } as never });

    expect(languageMock.setLanguageFromRoute).toHaveBeenCalledWith('en');
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
    expect(result).toEqual({ commands: ['/'] });
  });

  it('prefers explicit lang param over route config path', () => {
    runGuard({ paramMap: convertToParamMap({ lang: 'es' }), routeConfig: { path: 'en' } as never });

    expect(languageMock.setLanguageFromRoute).toHaveBeenCalledWith('es');
  });

  it('redirects unsupported languages without applying them', () => {
    runGuard({ paramMap: convertToParamMap({ lang: 'fr' }), routeConfig: { path: 'fr' } as never });

    expect(languageMock.setLanguageFromRoute).not.toHaveBeenCalled();
    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/']);
  });
});
