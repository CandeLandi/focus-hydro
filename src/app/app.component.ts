import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { LanguageService } from './core/i18n/language.service';
import { SeoI18nService } from './core/seo/seo-i18n.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private language = inject(LanguageService);
  private seo = inject(SeoI18nService);
  title = 'Focus and Hydrate';

  ngOnInit(): void {
    this.language.initialize();
    this.seo.init();
  }
}
