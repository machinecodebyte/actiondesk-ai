export type MetricsSnapshot = {
  collectedAt: string;
  counters: Record<string, number>;
};

export function getMetricsSnapshot(): MetricsSnapshot {
  return {
    collectedAt: new Date().toISOString(),
    counters: {}
  };
}
