import { TestBed } from '@angular/core/testing';
import { PLATFORM_ID } from '@angular/core';
import { AmbientSoundService } from './ambient-sound.service';

describe('AmbientSoundService', () => {
  const playSpy = jasmine.createSpy('play').and.returnValue(Promise.resolve());
  const pauseSpy = jasmine.createSpy('pause');
  let audioStub: {
    preload: string;
    loop: boolean;
    volume: number;
    currentTime: number;
    play: jasmine.Spy;
    pause: jasmine.Spy;
    addEventListener: jasmine.Spy;
  };
  const audioHandlers: Record<string, EventListener> = {};
  let ctorSpy: jasmine.Spy;
  const OriginalAudio = globalThis.Audio;

  beforeEach(() => {
    localStorage.clear();
    Object.keys(audioHandlers).forEach(k => delete audioHandlers[k]);
    const addSpy = jasmine.createSpy('addEventListener').and.callFake((ev: string, fn: EventListener) => {
      audioHandlers[ev] = fn;
    });
    audioStub = {
      preload: '',
      loop: false,
      volume: 0,
      currentTime: 0,
      play: playSpy,
      pause: pauseSpy,
      addEventListener: addSpy
    };
    ctorSpy = jasmine.createSpy('AudioCtor').and.returnValue(audioStub);
    (globalThis as unknown as { Audio: typeof Audio }).Audio = ctorSpy as unknown as typeof Audio;
    playSpy.calls.reset();
    pauseSpy.calls.reset();
  });

  afterEach(() => {
    (globalThis as unknown as { Audio: typeof Audio }).Audio = OriginalAudio;
  });

  it('creates audio with preload and loop', () => {
    TestBed.configureTestingModule({
      providers: [AmbientSoundService, { provide: PLATFORM_ID, useValue: 'browser' }]
    });
    TestBed.inject(AmbientSoundService);
    expect(ctorSpy).toHaveBeenCalled();
    expect(audioStub.preload).toBe('none');
    expect(audioStub.loop).toBeTrue();
  });

  it('toggles on: sets preference, calls play', async () => {
    TestBed.configureTestingModule({
      providers: [AmbientSoundService, { provide: PLATFORM_ID, useValue: 'browser' }]
    });
    const service = TestBed.inject(AmbientSoundService);
    expect(service.userEnabled()).toBeFalse();

    service.onHeaderButtonClick();
    expect(service.userEnabled()).toBeTrue();
    expect(playSpy).toHaveBeenCalled();
    expect(localStorage.getItem('focusflow-ambient-enabled')).toBe('true');
  });

  it('toggles off when playing', () => {
    TestBed.configureTestingModule({
      providers: [AmbientSoundService, { provide: PLATFORM_ID, useValue: 'browser' }]
    });
    const service = TestBed.inject(AmbientSoundService);
    service.onHeaderButtonClick();
    audioHandlers['play']?.(new Event('play'));
    expect(service.isPlaying()).toBeTrue();

    service.onHeaderButtonClick();
    expect(pauseSpy).toHaveBeenCalled();
    expect(service.userEnabled()).toBeFalse();
    expect(service.isPlaying()).toBeFalse();
    expect(localStorage.getItem('focusflow-ambient-enabled')).toBe('false');
  });

  it('does not instantiate audio on server platform', () => {
    TestBed.configureTestingModule({
      providers: [AmbientSoundService, { provide: PLATFORM_ID, useValue: 'server' }]
    });
    TestBed.inject(AmbientSoundService);
    expect(ctorSpy).not.toHaveBeenCalled();
  });
});
