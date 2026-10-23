/** One observed interval on one physical GPU, with an explicit logical task ID. */
export interface GpuUsageInterval {
  taskId: string;
  user: string;
  project: string;
  server: string;
  gpuId: string;
  model: string;
  start: number;
  finish?: number;
  lastObserved: number;
  estimated?: boolean;
}

export interface UsagePeriod {
  start: number;
  end: number;
}

export interface UsageSummary {
  gpuHours: number;
  taskHours: number;
  taskCount: number;
  userCount: number;
  estimated: boolean;
}

export interface UsageGroup extends UsageSummary {
  name: string;
  models: string[];
  servers: string[];
  favoriteServer: string;
}

type Interval = [number, number];
type ClippedUsage = GpuUsageInterval & { interval: Interval };

const key = (...parts: string[]) => JSON.stringify(parts);
const HOUR = 3_600_000;

const unionLength = (intervals: Interval[]) => {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  let total = 0;
  let end = -Infinity;
  for (const [start, finish] of sorted) {
    total += Math.max(0, finish - Math.max(start, end));
    end = Math.max(end, finish);
  }
  return total;
};

const clipped = (
  records: GpuUsageInterval[],
  period: UsagePeriod,
): ClippedUsage[] =>
  records.flatMap((record) => {
    if (!record.gpuId || !record.server || !record.taskId || !record.user)
      return [];
    const start = Math.max(record.start, period.start);
    // Running tasks stop at the latest reliable observation, including offline agents.
    const end = Math.min(record.finish ?? record.lastObserved, period.end);
    return Number.isFinite(start) && Number.isFinite(end) && end > start
      ? [{ ...record, interval: [start, end] as Interval }]
      : [];
  });

const totalUnion = (
  records: ClippedUsage[],
  identity: (r: ClippedUsage) => string,
) => {
  const groups = new Map<string, Interval[]>();
  for (const record of records) {
    const id = identity(record);
    const intervals = groups.get(id) ?? [];
    intervals.push(record.interval);
    groups.set(id, intervals);
  }
  return [...groups.values()].reduce(
    (sum, intervals) => sum + unionLength(intervals),
    0,
  );
};

const summarize = (records: ClippedUsage[]): UsageSummary => ({
  // Union by physical GPU, never multiply rank records by world size again.
  gpuHours: totalUnion(records, (r) => key(r.server, r.gpuId)) / HOUR,
  taskHours: totalUnion(records, (r) => key(r.user, r.taskId)) / HOUR,
  taskCount: new Set(records.map((r) => key(r.user, r.taskId))).size,
  userCount: new Set(records.map((r) => r.user)).size,
  estimated: records.some((r) => r.estimated),
});

export const summarizeUsage = (
  records: GpuUsageInterval[],
  period: UsagePeriod,
) => summarize(clipped(records, period));

/** Each dimension unions its own intervals; shared-card user totals may overlap. */
export const groupUsage = (
  records: GpuUsageInterval[],
  period: UsagePeriod,
  dimension: 'user' | 'project' | 'server' | 'model',
): UsageGroup[] => {
  const groups = new Map<string, ClippedUsage[]>();
  for (const record of clipped(records, period)) {
    const name = record[dimension];
    const group = groups.get(name) ?? [];
    group.push(record);
    groups.set(name, group);
  }
  return [...groups]
    .map(([name, group]) => {
      const servers = [...new Set(group.map((r) => r.server))];
      const favoriteServer =
        [...servers].sort((a, b) => {
          const hours = (server: string) =>
            summarize(group.filter((r) => r.server === server)).gpuHours;
          return hours(b) - hours(a) || a.localeCompare(b);
        })[0] ?? '';
      return {
        name,
        ...summarize(group),
        models: [...new Set(group.map((r) => r.model))],
        servers,
        favoriteServer,
      };
    })
    .sort((a, b) => b.gpuHours - a.gpuHours || a.name.localeCompare(b.name));
};

/** Calendar days use the deployment's Asia/Shanghai timezone, including partial days. */
export const dailyUsage = (
  records: GpuUsageInterval[],
  period: UsagePeriod,
) => {
  const day = 24 * HOUR;
  const offset = 8 * HOUR;
  const start = Math.floor((period.start + offset) / day) * day - offset;
  const result = [];
  for (let current = start; current < period.end; current += day) {
    const window = {
      start: Math.max(current, period.start),
      end: Math.min(current + day, period.end),
    };
    result.push({
      date: new Date(current + offset).toISOString().slice(0, 10),
      ...summarizeUsage(records, window),
    });
  }
  return result;
};
