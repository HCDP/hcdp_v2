export interface Period {
  unit: TimeUnit,
  interval: number
};

export type TimeUnit = "year" | "hour" | "minute" | "second";