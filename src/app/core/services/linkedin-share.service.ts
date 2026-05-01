import { Injectable, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { CelebrationStats } from '../../shared/models/celebration.model';

/** Public site URL used in LinkedIn share-offsite and suggested post CTA. */
export const FOCUSFLOW_PUBLIC_SITE_URL = 'https://focusflow-pomodoro.com' as const;

export interface LinkedInShareTabResult {
  readonly opened: boolean;
  readonly shareUrl: string;
}

/** Kept for future backend/OAuth flows; celebration dialog only downloads the achievement image. */
@Injectable({
  providedIn: 'root'
})
export class LinkedInShareService {
  private readonly translate = inject(TranslateService);

  /**
   * LinkedIn `share-offsite` only opens the composer with a link preview for the given `url`.
   * Uploading a locally generated image into the post body requires LinkedIn OAuth and the
   * UGC Posts REST API (typically with a backend to protect client secrets). Intentionally
   * not implemented here — keep this flow frontend-only until a server-side integration exists.
   */
  buildShareOffsiteUrl(): string {
    const encoded = encodeURIComponent(FOCUSFLOW_PUBLIC_SITE_URL);
    return `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`;
  }

  tryOpenShareOffsiteInNewTab(): LinkedInShareTabResult {
    const shareUrl = this.buildShareOffsiteUrl();
    const win = globalThis.window.open(shareUrl, '_blank', 'noopener,noreferrer');
    /** `null` usually means a popup blocker; do not rely on `window.closed` for immediate detection. */
    const opened = win !== null;
    return { opened, shareUrl };
  }

  buildSuggestedPostText(stats: CelebrationStats): string {
    const opening = stats.displayName
      ? this.translate.instant('celebration.linkedinShare.postOpeningNamed', { name: stats.displayName })
      : this.translate.instant('celebration.linkedinShare.postOpening');

    const statsLine =
      stats.tasksCompleted === 1
        ? this.translate.instant('celebration.linkedinShare.postStatsSingular', {
            focusTime: stats.totalFocusTime
          })
        : this.translate.instant('celebration.linkedinShare.postStatsPlural', {
            focusTime: stats.totalFocusTime,
            tasksCompleted: stats.tasksCompleted
          });

    const tagline = this.translate.instant('celebration.linkedinShare.postTagline');
    const cta = this.translate.instant('celebration.linkedinShare.postCta', { url: FOCUSFLOW_PUBLIC_SITE_URL });
    const hashtags = this.translate.instant('celebration.linkedinShare.postHashtags');

    return [opening, '', statsLine, '', tagline, '', cta, '', hashtags].join('\n');
  }
}
