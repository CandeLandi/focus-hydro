/** Tarea del día (compatible con futura extensión: completedAt, sesiones dedicadas) */
export interface HydroTask {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
  completedAt?: number | null;
}

export interface DailyState {
  dateKey: string; // yyyy-mm-dd
  tasks: HydroTask[];
  completedSessions: number;
  totalFocusMinutes: number;
  summaryGenerated: boolean;
}

export function getTodayDateKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getLocalDateKeyForEpoch(epochMs: number): string {
  const d = new Date(epochMs);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
