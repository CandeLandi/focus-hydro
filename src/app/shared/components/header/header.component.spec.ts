import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HeaderComponent } from './header.component';
import { HydroFocusDailyService } from '../../../core/services/hydrofocus-daily.service';
import { AmbientSoundService } from '../../../core/services/ambient-sound.service';
import { LanguageService } from '../../../core/i18n/language.service';

describe('HeaderComponent', () => {
  const dailyMock = {
    completedSessions: signal(2),
    totalFocusMinutes: signal(75)
  };
  const languageMock = {
    currentLanguage: signal<'es' | 'en'>('es'),
    setLanguage: jasmine.createSpy('setLanguage')
  };
  const ambientMock = {
    userEnabled: signal(false),
    isPlaying: signal(false),
    onHeaderButtonClick: jasmine.createSpy('onHeaderButtonClick')
  };

  beforeEach(async () => {
    dailyMock.completedSessions.set(2);
    dailyMock.totalFocusMinutes.set(75);
    languageMock.currentLanguage.set('es');
    languageMock.setLanguage.calls.reset();
    await TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        { provide: HydroFocusDailyService, useValue: dailyMock },
        { provide: LanguageService, useValue: languageMock },
        { provide: AmbientSoundService, useValue: ambientMock }
      ]
    })
      .overrideComponent(HeaderComponent, { set: { template: '' } })
      .compileComponents();
  });

  it('derives next session and formatted focus time', () => {
    const fixture = TestBed.createComponent(HeaderComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.sessionNumber()).toBe(3);
    expect(component.focusTimeLabel()).toBe('1h 15m');
  });

  it('formats zero and sub-hour focus time', () => {
    dailyMock.totalFocusMinutes.set(0);
    const fixture = TestBed.createComponent(HeaderComponent);
    const component = fixture.componentInstance;

    expect(component.focusTimeLabel()).toBe('0 min');

    dailyMock.totalFocusMinutes.set(35);
    expect(component.focusTimeLabel()).toBe('35 min');
  });

  it('delegates language changes', () => {
    const component = TestBed.createComponent(HeaderComponent).componentInstance;

    component.setLanguage('en');

    expect(languageMock.setLanguage).toHaveBeenCalledWith('en', true);
  });
});
