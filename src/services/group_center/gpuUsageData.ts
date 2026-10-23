import type {
  GpuUsageInterval,
  UsagePeriod,
} from '../../pages/Statistics/utils/gpuHours';

export interface StoredGpuTask {
  id?: number;
  serverNameEng: string;
  taskId?: string | number;
  taskUser: string;
  taskPid: number;
  taskGpuId: number;
  taskGpuName: string;
  taskStartTime: number;
  taskFinishTime?: number;
  taskRunningTimeInSeconds?: number;
  projectName?: string;
  projectDirectory?: string;
  pyFileName?: string;
  isMultiGpu?: boolean;
  multiDeviceWorldSize?: number;
  topPythonPid?: number;
  /** Set only for a current Agent snapshot, never inferred from the wall clock. */
  observedAt?: number;
  stale?: boolean;
}

export interface UsageServer {
  id: string;
  name: string;
  model: string;
  cards: number | null;
}

export interface RealUsageData {
  records: GpuUsageInterval[];
  period: UsagePeriod;
  servers: UsageServer[];
  historicalRows: number;
  liveRows: number;
  excludedRows: number;
  uncertainGroups: number;
  incompleteGroups: number;
  staleServers: string[];
  unavailableServers: string[];
}

const HOUR = 3_600_000;
const identity = (...parts: unknown[]) => JSON.stringify(parts);
const timestamp = (value: number | undefined) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? (n < 1e12 ? n * 1000 : n) : 0;
};
export const compactGpuModel = (name: string) =>
  name.trim().replace(/^NVIDIA\s+(?:GeForce\s+)?/i, '') || '未知型号';

/** Normalize observed intervals; unknown ranks are never synthesized from worldSize. */
export function normalizeGpuUsage(rows: StoredGpuTask[], period: UsagePeriod) {
  const groups = new Map<
    string,
    {
      taskId: string;
      anchor: number;
      rows: GpuUsageInterval[];
      expected: number;
      uncertain: boolean;
      gpus: Set<string>;
    }[]
  >();
  let excludedRows = 0;
  // Sorting gives a stable launch anchor even when DDP workers start slightly apart.
  for (const row of [...rows].sort(
    (a, b) => timestamp(a.taskStartTime) - timestamp(b.taskStartTime),
  )) {
    const server = row.serverNameEng?.trim().toUpperCase();
    const start = timestamp(row.taskStartTime);
    const finish = timestamp(row.taskFinishTime);
    const observed = timestamp(row.observedAt);
    const end = finish || observed;
    if (
      !server ||
      !row.taskUser?.trim() ||
      !Number.isInteger(row.taskGpuId) ||
      row.taskGpuId < 0 ||
      !start ||
      end <= start ||
      start >= period.end ||
      end <= period.start
    ) {
      excludedRows++;
      continue;
    }
    const world = Math.max(1, Number(row.multiDeviceWorldSize) || 1);
    const multi = row.isMultiGpu || world > 1;
    const root = Number(row.topPythonPid);
    const pid = Number(row.taskPid);
    const hasRoot = multi && root > 0;
    const process = hasRoot
      ? ['root', root]
      : pid > 0
        ? ['pid', pid]
        : ['record', row.taskId ?? row.id];
    if (!hasRoot && !(pid > 0) && !row.taskId && !row.id) {
      excludedRows++;
      continue;
    }
    const scope = identity(
      server,
      row.taskUser.trim(),
      row.projectDirectory || row.projectName || '',
      row.pyFileName || '',
      process,
    );
    const launches = groups.get(scope) ?? [];
    // PID reuse is separated by launch time. An ungrouped process must match exactly.
    let launch = launches.find(
      (g) => Math.abs(g.anchor - start) <= (hasRoot ? 10_000 : 0),
    );
    if (!launch) {
      launch = {
        taskId: identity(scope, start),
        anchor: start,
        rows: [],
        expected: world,
        uncertain: Boolean(multi && !hasRoot),
        gpus: new Set(),
      };
      launches.push(launch);
      groups.set(scope, launches);
    }
    launch.expected = Math.max(launch.expected, world);
    launch.gpus.add(String(row.taskGpuId));
    launch.rows.push({
      taskId: launch.taskId,
      user: row.taskUser.trim(),
      project: row.projectName?.trim() || '未命名项目',
      server,
      gpuId: String(row.taskGpuId),
      model: compactGpuModel(row.taskGpuName || ''),
      start,
      finish: finish || undefined,
      lastObserved: end,
      // A current snapshot does not prove continuous use of this GPU since launch.
      estimated: !finish || Boolean(row.stale) || Boolean(multi && !hasRoot),
    });
  }
  const launches = [...groups.values()].flat();
  let incompleteGroups = 0;
  for (const launch of launches) {
    if (launch.expected > launch.gpus.size) {
      incompleteGroups++;
      launch.rows.forEach((row) => {
        row.estimated = true;
      });
    }
  }
  return {
    records: launches.flatMap((g) => g.rows),
    excludedRows,
    uncertainGroups: launches.filter((g) => g.uncertain).length,
    incompleteGroups,
  };
}

interface Envelope<T> {
  isSucceed: boolean;
  result: T;
  serverVersion?: string;
}
interface Machine {
  serverNameEng: string;
  gpu: boolean;
}
interface LiveTask {
  id: number;
  pid: number;
  name: string;
  projectName: string;
  projectDirectory: string;
  pyFileName: string;
  startTimestamp: number;
  worldSize: number;
  topPythonPid: number;
}
interface GpuView {
  serverNameEng: string;
  snapshotTime: number;
  gpuCount: number;
  stale: boolean;
  snapshot: {
    gpuId: number;
    gpuName: string;
    hasData: boolean;
    tasks: LiveTask[];
  }[];
}
interface TaskPage {
  data: StoredGpuTask[];
  pagination: { totalItems: number };
}

export async function loadRealGpuUsage(
  days: number,
  options: {
    signal?: AbortSignal;
    requirePreviewSource?: boolean;
    fetcher?: typeof fetch;
    now?: number;
    onProgress?: (count: number) => void;
  } = {},
): Promise<RealUsageData> {
  if (![1, 7, 30].includes(days)) throw new Error('不支持的统计时间范围');
  const end = options.now ?? Date.now();
  const period = { start: end - days * 24 * HOUR, end };
  const fetcher = options.fetcher ?? fetch;
  const request = async <T>(path: string, body?: unknown): Promise<T> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(abort, 30_000);
    try {
      const response = await fetcher(path, {
        method: body ? 'POST' : 'GET',
        signal: controller.signal,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) throw new Error(`真实数据接口返回 ${response.status}`);
      // Fail closed if a development mock accidentally intercepts the real-data preview.
      if (
        options.requirePreviewSource &&
        response.headers.get('x-gc-preview-source') !== 'server-read-only'
      )
        throw new Error('当前未连接 server 的只读预览，请启动真实数据预览服务');
      const envelope = (await response.json()) as Envelope<T>;
      if (!envelope.isSucceed || envelope.result == null)
        throw new Error('数据查询未成功');
      return envelope.result;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  };

  const machines = (
    await request<Machine[]>('/web/open/realtime/machines')
  ).filter((m) => m.gpu);
  if (!machines.length) throw new Error('没有可用于统计的 GPU 服务器');
  const activeIds = new Set(machines.map((m) => m.serverNameEng.toUpperCase()));
  const filters: { field: string; operator: string; value: string | number }[] =
    [
      { field: 'MESSAGE_TYPE', operator: 'EQUALS', value: 'finish' },
      {
        field: 'TASK_FINISH_TIME',
        operator: 'GREATER_EQUAL',
        value: String(Math.floor(period.start / 1000)),
      },
      {
        field: 'TASK_FINISH_TIME',
        operator: 'LESS_EQUAL',
        value: String(Math.floor(period.end / 1000)),
      },
    ];
  const historical: StoredGpuTask[] = [];
  let cursor: number | undefined;
  let expected: number | undefined;
  // Keyset pagination prevents new records inserted during loading from shifting pages.
  for (let page = 0; ; page++) {
    if (page >= 100)
      throw new Error('记录过多，本次统计未完整加载，请缩短时间范围');
    const result = await request<TaskPage>('/web/open/gpu-tasks/query', {
      filters:
        cursor == null
          ? filters
          : [...filters, { field: 'ID', operator: 'LESS_THAN', value: cursor }],
      pagination: { page: 1, pageSize: 1000, sortBy: 'ID', sortOrder: 'DESC' },
      includeStatistics: false,
    });
    if (!Array.isArray(result.data))
      throw new Error('任务查询响应缺少明细记录');
    expected ??= result.pagination.totalItems;
    if (!result.data.length && historical.length < expected)
      throw new Error('历史任务加载不完整，请刷新重试');
    historical.push(...result.data);
    options.onProgress?.(historical.length);
    if (result.data.length < 1000) break;
    const next = Number(result.data[result.data.length - 1].id);
    if (
      !Number.isSafeInteger(next) ||
      next <= 0 ||
      (cursor != null && next >= cursor)
    )
      throw new Error('任务分页未正常推进');
    cursor = next;
  }
  if (historical.length < (expected ?? 0))
    throw new Error('历史任务加载不完整，请刷新重试');

  const servers: UsageServer[] = [];
  const live: StoredGpuTask[] = [];
  const staleServers: string[] = [];
  const unavailableServers: string[] = [];
  // Limit live reads to three concurrent requests; use existing server-side snapshots.
  for (let offset = 0; offset < machines.length; offset += 3) {
    const batch = machines.slice(offset, offset + 3);
    await Promise.all(
      batch.map(async (machine) => {
        const name = machine.serverNameEng.toUpperCase();
        const fallbackModels = [
          ...new Set(
            historical
              .filter((r) => r.serverNameEng?.toUpperCase() === name)
              .map((r) => compactGpuModel(r.taskGpuName)),
          ),
        ];
        try {
          const view = await request<GpuView>(
            `/web/open/realtime/machines/${encodeURIComponent(machine.serverNameEng)}/gpu`,
          );
          if (!(view.snapshotTime > 0) || !Array.isArray(view.snapshot))
            throw new Error('无有效快照');
          if (view.stale) staleServers.push(name);
          const models = [
            ...new Set(
              view.snapshot
                .filter((g) => g.hasData)
                .map((g) => compactGpuModel(g.gpuName)),
            ),
          ];
          servers.push({
            id: machine.serverNameEng,
            name,
            model:
              (models.length ? models : fallbackModels).join(' / ') ||
              '暂无型号记录',
            cards: view.gpuCount || null,
          });
          for (const gpu of view.snapshot.filter((g) => g.hasData)) {
            for (const task of gpu.tasks ?? []) {
              live.push({
                serverNameEng: machine.serverNameEng,
                taskId: task.id,
                taskUser: task.name,
                taskPid: task.pid,
                taskGpuId: gpu.gpuId,
                taskGpuName: gpu.gpuName,
                taskStartTime: task.startTimestamp,
                observedAt: view.snapshotTime,
                projectName: task.projectName,
                projectDirectory: task.projectDirectory,
                pyFileName: task.pyFileName,
                multiDeviceWorldSize: task.worldSize,
                topPythonPid: task.topPythonPid,
                stale: view.stale,
              });
            }
          }
        } catch (error) {
          if (options.signal?.aborted) throw error;
          unavailableServers.push(name);
          servers.push({
            id: machine.serverNameEng,
            name,
            model: fallbackModels.join(' / ') || '暂无型号记录',
            cards: null,
          });
        }
      }),
    );
  }
  const order = machines.map((m) => m.serverNameEng.toUpperCase());
  servers.sort((a, b) => order.indexOf(a.name) - order.indexOf(b.name));
  const relevant = historical.filter((r) =>
    activeIds.has(r.serverNameEng?.toUpperCase()),
  );
  const normalized = normalizeGpuUsage([...relevant, ...live], period);
  return {
    ...normalized,
    period,
    servers,
    historicalRows: relevant.length,
    liveRows: live.length,
    staleServers,
    unavailableServers,
  };
}
