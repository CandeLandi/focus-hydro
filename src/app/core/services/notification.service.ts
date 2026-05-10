import { Injectable, computed, signal, inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { LanguageService } from '../i18n/language.service';

export interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  browserNotificationEnabled: boolean;
}

export type TransitionTipType = 'focus-to-break' | 'break-to-focus';

export interface TransitionTip {
  type: TransitionTipType;
  title: string;
  message: string;
}

/** Opciones al completar sesión (p. ej. detección al volver del background en móvil). */
export interface SessionNotifyOptions {
  /** Si true y el dispositivo parece móvil, no pedimos/mostramos notificación del sistema (el usuario no tenía la pestaña activa). */
  fromDeferredDetection?: boolean;
}

function getAudioContextConstructor(): typeof AudioContext | undefined {
  if (typeof globalThis === 'undefined') return undefined;
  const w = globalThis as typeof globalThis & { webkitAudioContext?: typeof AudioContext };
  const ctor = w.AudioContext ?? w.webkitAudioContext;
  return typeof ctor === 'function' ? ctor : undefined;
}

function isCoarsePointerDevice(): boolean {
  if (typeof globalThis === 'undefined' || !globalThis.matchMedia) return false;
  return globalThis.matchMedia('(pointer: coarse)').matches;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly SETTINGS_KEY = 'hydrofocus-notification-settings';
  private readonly TIP_AUTO_HIDE_MS = 5200;
  private readonly TRANSITION_SOUND_REPEATS = 2;
  private readonly TRANSITION_REPEAT_GAP_SECONDS = 0.14;
  private tipAutoHideTimer: ReturnType<typeof setTimeout> | null = null;

  private settings = this.loadSettings();
  /** AudioContext se inicializa con un gesto del usuario para que el sonido funcione al terminar el timer */
  private audioContext: AudioContext | null = null;
  private visibleTip = signal<TransitionTip | null>(null);
  transitionTip = computed(() => this.visibleTip());
  private translate = inject(TranslateService);
  private language = inject(LanguageService);


  private lastTipIndexByType: Record<TransitionTipType, number> = {
    'focus-to-break': -1,
    'break-to-focus': -1
  };

  constructor() {
    this.initializePermissions();
  }

  /**
   * Solicita permisos para notificaciones del navegador
   */
  private async initializePermissions(): Promise<void> {
    if ('Notification' in window && Notification.permission === 'default') {
      // No solicitamos automáticamente para no ser intrusivos
      // Se solicitará cuando el usuario complete su primera sesión
    }
  }

  /**
   * Solicita permisos para notificaciones
   */
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('[Focus and Hydrate] Este navegador no soporta notificaciones');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      console.warn('[Focus and Hydrate] Permisos de notificación denegados');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('[Focus and Hydrate] Error al solicitar permisos:', error);
      return false;
    }
  }

  /**
   * Notifica cuando se completa un bloque de enfoque. La sesión ya cuenta en las métricas del día.
   */
  async notifyFocusSessionCompleted(options?: SessionNotifyOptions): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    const title = this.t('notifications.focusTitle');
    const message = this.t('notifications.focusMessage');
    this.showTransitionTip('focus-to-break');

    const skipSystemNotification = options?.fromDeferredDetection === true && isCoarsePointerDevice();

    if (this.settings.soundEnabled) {
      try {
        await this.playCompletionSound();
      } catch {
        /* Autoplay / context suspendido: no insistir */
      }
    }

    if (this.settings.browserNotificationEnabled && !skipSystemNotification) {
      await this.showBrowserNotification(title, message, {
        icon: '/images/logo-hydrofocus.svg',
        badge: '/images/logo-hydrofocus.svg',
        tag: 'focus-session-completed',
        requireInteraction: false,
        silent: false
      });
    }
  }

  /**
   * Notifica cuando se completa un descanso (con recordatorio de hidratación)
   */
  async notifyBreakCompleted(options?: SessionNotifyOptions): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    const title = this.t('notifications.breakTitle');
    const message = this.t('notifications.breakMessage');
    this.showTransitionTip('break-to-focus');

    const skipSystemNotification = options?.fromDeferredDetection === true && isCoarsePointerDevice();

    if (this.settings.soundEnabled) {
      try {
        await this.playBreakSound();
      } catch {
        /* Autoplay / context suspendido */
      }
    }

    if (this.settings.browserNotificationEnabled && !skipSystemNotification) {
      await this.showBrowserNotification(title, message, {
        icon: '/images/logo-hydrofocus.svg',
        badge: '/images/logo-hydrofocus.svg',
        tag: 'break-completed',
        requireInteraction: false,
        silent: false
      });
    }
  }

  showTransitionTip(type: TransitionTipType): void {
    const message = this.getRandomTip(type);
    const title = type === 'focus-to-break' ? this.t('notifications.tipFocusDone') : this.t('notifications.tipBackToFocus');
    this.visibleTip.set({ type, title, message });
    this.scheduleTipAutoHide();
  }

  dismissTransitionTip(): void {
    this.visibleTip.set(null);
    this.clearTipAutoHideTimer();
  }

  private scheduleTipAutoHide(): void {
    this.clearTipAutoHideTimer();
    this.tipAutoHideTimer = setTimeout(() => {
      this.visibleTip.set(null);
      this.tipAutoHideTimer = null;
    }, this.TIP_AUTO_HIDE_MS);
  }

  private clearTipAutoHideTimer(): void {
    if (!this.tipAutoHideTimer) return;
    clearTimeout(this.tipAutoHideTimer);
    this.tipAutoHideTimer = null;
  }

  private getRandomTip(type: TransitionTipType): string {
    this.language.translationTick();
    const raw = this.translate.instant(
      type === 'focus-to-break' ? 'notifications.focusToBreakTips' : 'notifications.breakToFocusTips'
    );
    const source = Array.isArray(raw) ? raw : [];
    if (source.length === 0) return '';
    if (source.length === 1) return source[0];

    const lastIndex = this.lastTipIndexByType[type];
    let nextIndex = lastIndex;
    while (nextIndex === lastIndex) {
      nextIndex = Math.floor(Math.random() * source.length);
    }
    this.lastTipIndexByType[type] = nextIndex;
    return source[nextIndex];
  }

  private t(key: string, params?: Record<string, unknown>): string {
    this.language.currentLanguage();
    this.language.translationTick();
    const translated = this.translate.instant(key, params);
    return typeof translated === 'string' ? translated : key;
  }

  /**
   * Muestra una notificación del navegador
   */
  private async showBrowserNotification(
    title: string,
    message: string,
    options: NotificationOptions = {}
  ): Promise<void> {
    if (!('Notification' in window)) {
      return;
    }

    const hasPermission = await this.requestPermission();
    if (!hasPermission) {
      return;
    }

    try {
      const notification = new Notification(title, {
        body: message,
        ...options
      });

      // Cerrar automáticamente después de 5 segundos
      setTimeout(() => {
        notification.close();
      }, 5000);

      // Manejar clic en la notificación
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (error) {
      console.error('[Focus and Hydrate] Error al mostrar notificación:', error);
    }
  }

  /**
   * Debe llamarse desde un gesto del usuario (ej. al hacer clic en Iniciar foco)
   * para que el sonido pueda reproducirse después cuando termine el timer.
   */
  prepareAudio(): void {
    const Ctor = getAudioContextConstructor();
    if (typeof globalThis === 'undefined' || !Ctor) return;
    try {
      if (!this.audioContext) {
        this.audioContext = new Ctor();
      }
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
    } catch (e) {
      console.warn('[Focus and Hydrate] No se pudo preparar audio:', e);
    }
  }

  /**
   * Reproduce un sonido de finalización más notorio (3 pulsos cortos).
   */
  private async playCompletionSound(): Promise<void> {
    const played = await this.playChime(
      [880, 1040, 1240],
      0.2,
      0.06,
      0.62,
      'triangle',
      this.TRANSITION_SOUND_REPEATS,
      this.TRANSITION_REPEAT_GAP_SECONDS
    );
    if (!played) {
      this.playToneFallbackSequence(
        [880, 1040, 1240],
        200,
        70,
        0.56,
        'triangle',
        this.TRANSITION_SOUND_REPEATS,
        180
      );
    }
  }

  /**
   * Reproduce un sonido para el descanso (3 pulsos suaves).
   */
  private async playBreakSound(): Promise<void> {
    const played = await this.playChime(
      [620, 700, 620],
      0.16,
      0.05,
      0.48,
      'sine',
      this.TRANSITION_SOUND_REPEATS,
      this.TRANSITION_REPEAT_GAP_SECONDS
    );
    if (!played) {
      this.playToneFallbackSequence(
        [620, 700, 620],
        170,
        60,
        0.42,
        'sine',
        this.TRANSITION_SOUND_REPEATS,
        170
      );
    }
  }

  /**
   * Reproduce una secuencia de tonos (ej. dos notas para “sesión lista”)
   */
  private async playChime(
    frequencies: number[],
    durationPerNote: number,
    gapSeconds: number,
    peakGain: number = 0.25,
    waveType: OscillatorType = 'sine',
    repeats: number = 1,
    repeatGapSeconds: number = 0.12
  ): Promise<boolean> {
    const ctx = await this.getAudioContextReady();
    if (!ctx) return false;
    try {
      let time = ctx.currentTime + 0.02;
      for (let cycle = 0; cycle < Math.max(1, repeats); cycle++) {
        for (const freq of frequencies) {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = freq;
          osc.type = waveType;
          gain.gain.setValueAtTime(0, time);
          gain.gain.linearRampToValueAtTime(peakGain, time + 0.015);
          gain.gain.linearRampToValueAtTime(0, time + durationPerNote);
          osc.start(time);
          osc.stop(time + durationPerNote + 0.01);
          time += durationPerNote + gapSeconds;
        }
        if (cycle < repeats - 1) {
          time += repeatGapSeconds;
        }
      }
      return true;
    } catch (error) {
      console.error('[Focus and Hydrate] Error al reproducir chime:', error);
      return false;
    }
  }

  private playToneFallbackSequence(
    frequencies: number[],
    durationMs: number,
    gapMs: number,
    gain: number,
    type: OscillatorType,
    repeats: number = 1,
    repeatGapMs: number = 140
  ): void {
    const sequenceDurationMs = frequencies.length * durationMs + Math.max(0, frequencies.length - 1) * gapMs;
    for (let cycle = 0; cycle < Math.max(1, repeats); cycle++) {
      const cycleOffset = cycle * (sequenceDurationMs + repeatGapMs);
      frequencies.forEach((freq, index) => {
        const delay = cycleOffset + index * (durationMs + gapMs);
        setTimeout(() => this.playTone(freq, durationMs / 1000, type, gain), delay);
      });
    }
  }

  /**
   * Genera y reproduce un tono usando Web Audio API
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine',
    peakGain: number = 0.28
  ): void {
    const audioContext = this.getAudioContext();
    if (!audioContext) return;
    try {
      if (audioContext.state === 'closed') return;
      if (audioContext.state === 'suspended') {
        void audioContext.resume();
      }
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;

      const t = audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, t);
      gainNode.gain.linearRampToValueAtTime(peakGain, t + 0.02);
      gainNode.gain.linearRampToValueAtTime(0, t + duration);

      oscillator.start(t);
      oscillator.stop(t + duration);
    } catch (error) {
      console.error('[Focus and Hydrate] Error al reproducir sonido:', error);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof globalThis === 'undefined') return null;
    try {
      if (!this.audioContext) {
        const Ctor = getAudioContextConstructor();
        if (!Ctor) return null;
        this.audioContext = new Ctor();
      }
      return this.audioContext;
    } catch {
      return null;
    }
  }

  private async getAudioContextReady(): Promise<AudioContext | null> {
    let ctx = this.getAudioContext();
    if (!ctx) return null;
    try {
      if (ctx.state === 'closed') {
        this.audioContext = null;
        ctx = this.getAudioContext();
        if (!ctx) return null;
      }
      if (ctx.state === 'suspended') {
        await ctx.resume();
        if (ctx.state === 'suspended') {
          await new Promise(resolve => setTimeout(resolve, 60));
          await ctx.resume();
        }
      }
      return ctx.state === 'running' ? ctx : null;
    } catch {
      return null;
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getSettings(): NotificationSettings {
    return { ...this.settings };
  }

  /**
   * Actualiza la configuración
   */
  updateSettings(settings: Partial<NotificationSettings>): void {
    this.settings = { ...this.settings, ...settings };
    this.saveSettings();
  }

  /**
   * Carga la configuración desde localStorage
   */
  private loadSettings(): NotificationSettings {
    try {
      const saved = localStorage.getItem(this.SETTINGS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('[Focus and Hydrate] Error al cargar configuración de notificaciones:', error);
    }

    // Configuración por defecto: todo habilitado
    return {
      enabled: true,
      soundEnabled: true,
      browserNotificationEnabled: true
    };
  }

  /**
   * Guarda la configuración en localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(this.settings));
    } catch (error) {
      console.error('[Focus and Hydrate] Error al guardar configuración de notificaciones:', error);
    }
  }
}

