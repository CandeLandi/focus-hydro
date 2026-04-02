export interface CelebrationStats {
  tasksCompleted: number;
  totalFocusTime: string; // Formato: "1h 30m"
  completionPercentage: number;
  date: Date;
  displayName?: string;
}

export interface LinkedInImageConfig {
  width: number;
  height: number;
  stats: CelebrationStats;
}



