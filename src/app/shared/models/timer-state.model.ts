export interface TimerPersistedState {
  mode: 'focus' | 'break';
  remainingSeconds: number;
  totalSeconds: number;
  /** Cuando el segmento actual empezó (si isRunning). Para recalcular al recargar. */
  startedAt: number | null;
  isRunning: boolean;
  lastUpdatedAt: number;
  hasShownFirstFocusIntro: boolean;
  hasShownFirstBreakIntro: boolean;
}
