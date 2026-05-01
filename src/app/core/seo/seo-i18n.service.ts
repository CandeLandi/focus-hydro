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
  private readonly socialImagePath = '/images/logo-hydrofocus.png';

  init(): void {
    this.updateSeo();
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.updateSeo();
    });
  }

  private updateSeo(): void {
    const lang = this.language.currentLanguage();
    const baseUrl = this.documentRef.location?.origin || 'https://focusandhydrate.com';
    const path = this.router.url.split('?')[0] || '/';
    const canonical = `${baseUrl}${path}`;
    const socialImage = `${baseUrl}${this.socialImagePath}`;
    const locale = lang === 'es' ? 'es_ES' : 'en_US';
    const oppositeLocale = lang === 'es' ? 'en_US' : 'es_ES';

    const appTitle = lang === 'es'
      ? 'Focus and Hydrate | Productividad con Pomodoro, hidratación y tareas'
      : 'Focus and Hydrate | Productivity with Pomodoro, hydration and tasks';
    const description = lang === 'es'
      ? 'Focus and Hydrate combina Pomodoro, seguimiento de hidratación y gestión de tareas para ayudarte a mantener enfoque profundo y hábitos saludables.'
      : 'Focus and Hydrate combines Pomodoro sessions, hydration tracking and task management to help you sustain deep focus and healthy work habits.';
    const keywords = lang === 'es'
      ? 'productividad, pomodoro, hidratacion, tareas, enfoque, gestion del tiempo, trabajo profundo'
      : 'productivity, pomodoro, hydration, tasks, focus, time management, deep work';

    this.documentRef.documentElement.lang = lang;

    this.title.setTitle(appTitle);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'keywords', content: keywords });
    this.meta.updateTag({ name: 'robots', content: 'index, follow' });
    this.meta.updateTag({ name: 'application-name', content: 'Focus and Hydrate' });

    this.meta.updateTag({ property: 'og:type', content: 'website' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Focus and Hydrate' });
    this.meta.updateTag({ property: 'og:url', content: canonical });
    this.meta.updateTag({ property: 'og:locale', content: locale });
    this.meta.updateTag({ property: 'og:locale:alternate', content: oppositeLocale });
    this.meta.updateTag({ property: 'og:title', content: appTitle });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:image', content: socialImage });
    this.meta.updateTag({ property: 'og:image:alt', content: 'Focus and Hydrate app logo' });

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

