import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';
import { LanguageService } from '../i18n/language.service';

@Injectable({ providedIn: 'root' })
export class SeoI18nService {
  private documentRef = inject(DOCUMENT);
  private title = inject(Title);
  private meta = inject(Meta);
  private router = inject(Router);
  private language = inject(LanguageService);
  private readonly socialImagePath = '/images/logo-hydrofocus.svg';
  private readonly publicSiteOrigin = 'https://www.focusflow-pomodoro.com';

  init(): void {
    this.updateSeo();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.updateSeo();
    });
  }

  private updateSeo(): void {
    const lang = this.language.currentLanguage();
    const origin = this.documentRef.location?.origin;
    const baseUrl =
      origin && /^https?:\/\//i.test(origin) ? origin : this.publicSiteOrigin;
    const path = this.router.url.split('?')[0] || '/';
    const canonical = `${baseUrl}${path}`;
    const socialImage = `${baseUrl}${this.socialImagePath}`;
    const locale = lang === 'es' ? 'es_ES' : 'en_US';
    const oppositeLocale = lang === 'es' ? 'en_US' : 'es_ES';

    const appTitle =
      lang === 'es'
        ? 'FocusFlow | Productividad con Pomodoro, foco e hidratación'
        : 'FocusFlow | Productivity with Pomodoro, focus & hydration';
    const description =
      lang === 'es'
        ? 'FocusFlow: temporizador Pomodoro, tareas del día e hidratación. Enfocate con claridad y cerrá el día con buen ritmo.'
        : 'FocusFlow: Pomodoro timer, daily tasks and hydration nudges. Stay clear-headed and finish strong.';
    const keywords =
      lang === 'es'
        ? 'FocusFlow, productividad, pomodoro, hidratación, tareas, enfoque, temporizador, gestión del tiempo'
        : 'FocusFlow, productivity, pomodoro, hydration, tasks, focus, timer, time management';

    this.documentRef.documentElement.lang = lang;

    this.title.setTitle(appTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ name: 'application-name', content: 'FocusFlow' });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'FocusFlow' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:locale', content: locale });
    this.meta.updateTag({ property: 'og:locale:alternate', content: oppositeLocale });
    this.meta.updateTag({ property: 'og:title', content: appTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: socialImage });
    this.meta.updateTag({ property: 'og:image:alt', content: 'FocusFlow' });
    this.meta.updateTag({ property: 'og:image:secure_url', content: socialImage });
    this.meta.updateTag({ property: 'og:image:type', content: 'image/svg+xml' });
    this.meta.updateTag({ property: 'og:image:width', content: '128' });
    this.meta.updateTag({ property: 'og:image:height', content: '128' });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title', content: appTitle });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: socialImage });

    this.setLink('canonical', canonical);
    this.setLink('alternate-es', canonical, 'alternate', 'es');
    this.setLink('alternate-en', canonical, 'alternate', 'en');
    this.setLink('alternate-x-default', canonical, 'alternate', 'x-default');
  }

  private setLink(id: string, href: string, rel = 'canonical', hreflang?: string): void {
    let link = this.documentRef.head.querySelector<HTMLLinkElement>(`#${id}`);
    if (!link) {
      link = this.documentRef.createElement('link');
      link.id = id;
      this.documentRef.head.appendChild(link);
    }
    link.rel = rel;
    link.href = href;
    if (hreflang) link.hreflang = hreflang;
  }
}

