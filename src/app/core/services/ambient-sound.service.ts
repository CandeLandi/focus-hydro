import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

const STORAGE_KEY = 'focusflow-ambient-enabled';
const AMBIENT_SRC = '/audio/ambient-water.wav';
const DEFAULT_VOLUME = 0.26;

@Injectable({ providedIn: 'root' })
export class AmbientSoundService {
  private readonly platformId = inject(PLATFORM_ID);
  private audio: HTMLAudioElement | null = null;

  /** Preferencia guardada: el usuario quiere sonido ambiental cuando pueda reproducirse. */
  readonly userEnabled = signal(false);
  /** Reproducción real (puede ser false tras recarga hasta el primer gesto). */
  readonly isPlaying = signal(false);

  constructor() {
    if (!isPlatformBrowser(this.platformId)) return;
    this.loadPreference();
    this.initAudio();
  }

  /** Un solo control desde el header: encender/reanudar o apagar. Solo tras gesto del usuario. */
  onHeaderButtonClick(): void {
    if (!isPlatformBrowser(this.platformId) || !this.audio) return;

    if (this.userEnabled() && this.isPlaying()) {
      this.disableAndPause();
      return;
    }

    this.userEnabled.set(true);
    this.persistPreference();
    void this.tryPlayFromUserGesture();
  }

  private disableAndPause(): void {
    if (!this.audio) return;
    this.isPlaying.set(false);
    this.audio.pause();
    this.audio.currentTime = 0;
    this.userEnabled.set(false);
    this.persistPreference();
  }

  private tryPlayFromUserGesture(): Promise<void> {
    if (!this.audio) return Promise.resolve();
    this.audio.volume = DEFAULT_VOLUME;
    return this.audio
      .play()
      .then(() => {
        this.isPlaying.set(true);
      })
      .catch(() => {
        this.isPlaying.set(false);
      });
  }

  private initAudio(): void {
    const el = new Audio(AMBIENT_SRC);
    el.preload = 'none';
    el.loop = true;
    el.addEventListener('play', () => this.isPlaying.set(true));
    el.addEventListener('pause', () => this.isPlaying.set(false));
    el.addEventListener('ended', () => this.isPlaying.set(false));
    el.addEventListener('error', () => {
      this.isPlaying.set(false);
    });
    this.audio = el;
  }

  private loadPreference(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      this.userEnabled.set(raw === 'true');
    } catch {
      this.userEnabled.set(false);
    }
  }

  private persistPreference(): void {
    try {
      localStorage.setItem(STORAGE_KEY, this.userEnabled() ? 'true' : 'false');
    } catch {
      /* ignore quota / private mode */
    }
  }
}
