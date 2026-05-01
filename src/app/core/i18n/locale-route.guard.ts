import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { LanguageService } from './language.service';

export const localeRouteGuard: CanActivateFn = (route) => {
  const languageService = inject(LanguageService);
  const router = inject(Router);
  const lang = route.paramMap.get('lang') ?? route.routeConfig?.path;
  if (!languageService.isSupported(lang)) {
    return router.createUrlTree(['/']);
  }
  languageService.setLanguageFromRoute(lang);
  return router.createUrlTree(['/']);
};

