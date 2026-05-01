import { routes } from './app.routes';
import { localeRouteGuard } from './core/i18n/locale-route.guard';

describe('routes', () => {
  it('defines root, legacy locale and fallback routes', () => {
    expect(routes[0].path).toBe('');
    expect(routes.find(route => route.path === 'es')?.canActivate).toEqual([localeRouteGuard]);
    expect(routes.find(route => route.path === 'en')?.canActivate).toEqual([localeRouteGuard]);
    expect(routes.at(-1)).toEqual({ path: '**', redirectTo: '' });
  });

  it('lazy-loads home component for root and locale routes', async () => {
    const rootComponent = await routes[0].loadComponent?.();
    const esComponent = await routes.find(route => route.path === 'es')?.loadComponent?.();
    const enComponent = await routes.find(route => route.path === 'en')?.loadComponent?.();

    expect(rootComponent).toBeTruthy();
    expect(esComponent).toBe(rootComponent);
    expect(enComponent).toBe(rootComponent);
  });
});
