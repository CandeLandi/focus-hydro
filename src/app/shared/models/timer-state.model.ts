export interface TimerPersistedState {
  mode: 'focus' | 'break';
  remainingSeconds: number;
  totalSeconds: number;
  /** Cuando el segmento actual empezó (si isRunning). Para recalcular al recargar. */
  startedAt: number | null;
  /** Fin absoluto del segmento en curso (ms epoch). Prioridad sobre startedAt+total al reanudar. */
  segmentEndsAt?: number | null;
  isRunning: boolean;
  lastUpdatedAt: number;
  hasShownFirstFocusIntro: boolean;
  hasShownFirstBreakIntro: boolean;
}
