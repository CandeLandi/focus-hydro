import { TestBed } from '@angular/core/testing';
import { TranslateService } from '@ngx-translate/core';
import { LinkedInShareService, FOCUSFLOW_PUBLIC_SITE_URL } from './linkedin-share.service';
import { CelebrationStats } from '../../shared/models/celebration.model';

describe('LinkedInShareService', () => {
  let service: LinkedInShareService;
  let translate: jasmine.SpyObj<TranslateService>;

  const stats: CelebrationStats = {
    tasksCompleted: 2,
    totalFocusTime: '50m',
    completionPercentage: 100,
    date: new Date('2026-04-28T10:00:00'),
    displayName: 'Candela'
  };

  beforeEach(() => {
    translate = jasmine.createSpyObj<TranslateService>('TranslateService', ['instant']);
    translate.instant.and.callFake((key: string, params?: Record<string, string | number>) => {
      switch (key) {
        case 'celebration.linkedinShare.postOpeningNamed':
          return `I'm ${params?.['name']} and today I completed my focus session with FocusFlow.`;
        case 'celebration.linkedinShare.postOpening':
          return 'Today I completed my focus session with FocusFlow.';
        case 'celebration.linkedinShare.postStatsSingular':
          return `${params?.['focusTime']} focus · 1 task completed`;
        case 'celebration.linkedinShare.postStatsPlural':
          return `${params?.['focusTime']} focus · ${params?.['tasksCompleted']} tasks completed`;
        case 'celebration.linkedinShare.postTagline':
          return 'Small daily decisions create big changes.';
        case 'celebration.linkedinShare.postCta':
          return `Try FocusFlow: ${params?.['url']}`;
        case 'celebration.linkedinShare.postHashtags':
          return '#FocusFlow #Pomodoro #Productivity #Frontend';
        default:
          return key;
      }
    });
    TestBed.configureTestingModule({
      providers: [LinkedInShareService, { provide: TranslateService, useValue: translate }]
    });
    service = TestBed.inject(LinkedInShareService);
  });

  it('builds share-offsite URL with encoded public site URL', () => {
    const url = service.buildShareOffsiteUrl();
    expect(url).toBe(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(FOCUSFLOW_PUBLIC_SITE_URL)}`
    );
  });

  it('returns opened true when window.open returns a window', () => {
    spyOn(window, 'open').and.returnValue({} as Window);
    const result = service.tryOpenShareOffsiteInNewTab();
    expect(result.opened).toBeTrue();
    expect(result.shareUrl).toContain('share-offsite');
  });

  it('returns opened false when window.open returns null', () => {
    spyOn(window, 'open').and.returnValue(null);
    const result = service.tryOpenShareOffsiteInNewTab();
    expect(result.opened).toBeFalse();
    expect(result.shareUrl).toContain('focusflow-pomodoro.com');
  });

  it('builds suggested post text with display name and plural stats', () => {
    const text = service.buildSuggestedPostText(stats);
    expect(text).toContain('Candela');
    expect(text).toContain('50m focus');
    expect(text).toContain('2 tasks completed');
    expect(text).toContain(FOCUSFLOW_PUBLIC_SITE_URL);
    expect(text).toContain('#FocusFlow');
  });

  it('builds suggested post text without author line when name is absent', () => {
    const text = service.buildSuggestedPostText({ ...stats, displayName: undefined });
    expect(text).not.toContain("I'm");
    expect(text).toContain('Today I completed my focus session with FocusFlow.');
  });

  it('uses singular stats line for one task', () => {
    const text = service.buildSuggestedPostText({ ...stats, tasksCompleted: 1 });
    expect(text).toContain('1 task completed');
    expect(text).not.toContain('1 tasks completed');
  });
});
