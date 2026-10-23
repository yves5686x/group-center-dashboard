import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeUsage } from '../src/pages/Statistics/utils/gpuHours.ts';
import {
  loadRealGpuUsage,
  normalizeGpuUsage,
} from '../src/services/group_center/gpuUsageData.ts';

const HOUR = 3_600_000;
const BASE = Date.parse('2026-10-01T00:00:00+08:00');
const END = BASE + 30 * 24 * HOUR;
const period = { start: BASE, end: END };
const row = (patch = {}) => ({
  id: 1,
  serverNameEng: '2082',
  taskId: 'gpu-0-process-11',
  taskUser: 'user-1',
  taskPid: 11,
  taskGpuId: 0,
  taskGpuName: 'NVIDIA GeForce RTX 2080 Ti',
  taskStartTime: BASE / 1000,
  taskFinishTime: (BASE + 10 * HOUR) / 1000,
  projectName: 'project',
  projectDirectory: '/project',
  pyFileName: 'train.py',
  isMultiGpu: true,
  multiDeviceWorldSize: 2,
  topPythonPid: 10,
  ...patch,
});

test('different Agent rank IDs share one DDP task, including slightly staggered starts', () => {
  const result = normalizeGpuUsage(
    [
      row(),
      row({
        taskId: 'gpu-1-process-12',
        taskPid: 12,
        taskGpuId: 1,
        taskStartTime: BASE / 1000 + 1,
        taskFinishTime: (BASE + 10 * HOUR) / 1000 + 1,
      }),
    ],
    period,
  );
  assert.equal(new Set(result.records.map((r) => r.taskId)).size, 1);
  assert.equal(summarizeUsage(result.records, period).gpuHours, 20);
  assert.equal(summarizeUsage(result.records, period).taskCount, 1);
  assert.equal(result.incompleteGroups, 0);
});

test('one PID on multiple GPUs is one task even without DDP metadata', () => {
  const rows = [0, 1, 2, 3].map((gpu) =>
    row({
      taskGpuId: gpu,
      isMultiGpu: false,
      multiDeviceWorldSize: 0,
      topPythonPid: -1,
    }),
  );
  const result = summarizeUsage(
    normalizeGpuUsage(rows, period).records,
    period,
  );
  assert.equal(result.taskCount, 1);
  assert.equal(result.gpuHours, 40);
  assert.equal(result.taskHours, 10);
});

test('PID reuse in a later launch cannot merge independent tasks', () => {
  const result = normalizeGpuUsage(
    [
      row(),
      row({
        taskStartTime: (BASE + 24 * HOUR) / 1000,
        taskFinishTime: (BASE + 25 * HOUR) / 1000,
      }),
    ],
    period,
  );
  assert.equal(summarizeUsage(result.records, period).taskCount, 2);
});

test('worldSize never invents unobserved GPU intervals', () => {
  const result = normalizeGpuUsage([row({ multiDeviceWorldSize: 8 })], period);
  assert.equal(summarizeUsage(result.records, period).gpuHours, 10);
  assert.equal(result.incompleteGroups, 1);
  assert.equal(result.records[0].estimated, true);
});

test('missing DDP parent remains separate and explicitly uncertain', () => {
  const result = normalizeGpuUsage(
    [
      row({ topPythonPid: -1 }),
      row({ taskPid: 12, taskGpuId: 1, topPythonPid: -1 }),
    ],
    period,
  );
  assert.equal(result.uncertainGroups, 2);
  assert.equal(
    result.records.every((r) => r.estimated),
    true,
  );
  assert.equal(summarizeUsage(result.records, period).taskCount, 2);
});

test('millisecond Agent starts and second snapshot times are normalized; offline gap is excluded', () => {
  const result = normalizeGpuUsage(
    [
      row({
        taskStartTime: BASE,
        taskFinishTime: 0,
        observedAt: (BASE + 2 * HOUR) / 1000,
        stale: true,
      }),
    ],
    period,
  );
  assert.equal(result.records[0].start, BASE);
  assert.equal(result.records[0].lastObserved, BASE + 2 * HOUR);
  assert.equal(summarizeUsage(result.records, period).gpuHours, 2);
  assert.equal(result.records[0].estimated, true);
});

test('invalid times and unknown GPU IDs are excluded instead of guessed', () => {
  const result = normalizeGpuUsage(
    [
      row({ taskFinishTime: 0 }),
      row({ taskGpuId: -1 }),
      row({ taskStartTime: NaN }),
    ],
    period,
  );
  assert.equal(result.records.length, 0);
  assert.equal(result.excludedRows, 3);
});

const response = (result, headers = true) =>
  new Response(JSON.stringify({ isSucceed: true, result }), {
    status: 200,
    headers: headers ? { 'x-gc-preview-source': 'server-read-only' } : {},
  });
const snapshot = {
  serverNameEng: '2082',
  snapshotTime: END / 1000,
  gpuCount: 2,
  stale: false,
  snapshot: [{ gpuId: 0, gpuName: 'RTX 2080 Ti', hasData: true, tasks: [] }],
};

test('loader retrieves all keyset pages and filters by finish overlap, not start date', async () => {
  const bodies = [];
  const rows = Array.from({ length: 1002 }, (_, i) =>
    row({
      id: 2000 - i,
      taskStartTime: (END - 8 * 24 * HOUR) / 1000,
      taskFinishTime: (END - HOUR) / 1000,
    }),
  );
  const fetcher = async (path, options) => {
    if (path.endsWith('/machines'))
      return response([
        { serverNameEng: '2082', gpu: true },
        { serverNameEng: 'Node01', gpu: false },
      ]);
    if (path.endsWith('/query')) {
      bodies.push(JSON.parse(options.body));
      return response({
        data: bodies.length === 1 ? rows.slice(0, 1000) : rows.slice(1000),
        pagination: { totalItems: bodies.length === 1 ? 1002 : 2 },
      });
    }
    return response(snapshot);
  };
  const result = await loadRealGpuUsage(7, { now: END, fetcher });
  assert.equal(result.historicalRows, 1002);
  assert.equal(bodies.length, 2);
  assert.equal(
    bodies[1].filters.find((f) => f.field === 'ID').value,
    rows[999].id,
  );
  assert.equal(
    bodies[0].filters.some((f) => f.field === 'TASK_START_TIME'),
    false,
  );
  assert.equal(result.servers.length, 1);
  assert.ok(result.records.length > 0);
});

test('intercepting mocks cannot masquerade as real data', async () => {
  await assert.rejects(
    loadRealGpuUsage(7, {
      now: END,
      requirePreviewSource: true,
      fetcher: async () => response([], false),
    }),
    /只读预览/,
  );
});

test('failed history page rejects the whole calculation instead of showing partial totals', async () => {
  const fetcher = async (path) =>
    path.endsWith('/machines')
      ? response([{ serverNameEng: '2082', gpu: true }])
      : new Response('{}', { status: 500 });
  await assert.rejects(loadRealGpuUsage(7, { now: END, fetcher }), /500/);
});

test('failed live snapshot preserves historical data and reports unavailable machine', async () => {
  const fetcher = async (path) => {
    if (path.endsWith('/machines'))
      return response([{ serverNameEng: '2082', gpu: true }]);
    if (path.endsWith('/query'))
      return response({
        data: [
          row({
            taskStartTime: (END - 10 * HOUR) / 1000,
            taskFinishTime: END / 1000,
          }),
        ],
        pagination: { totalItems: 1 },
      });
    return new Response('{}', { status: 502 });
  };
  const result = await loadRealGpuUsage(7, { now: END, fetcher });
  assert.equal(result.historicalRows, 1);
  assert.deepEqual(result.unavailableServers, ['2082']);
  assert.equal(result.servers[0].cards, null);
  assert.equal(result.records.length, 1);
});

// The deployed site talks to nginx directly, without a localhost preview proxy.
test('production loads same-origin API responses without preview headers', async () => {
  const paths = [];
  const fetcher = async (path) => {
    paths.push(path);
    if (path.endsWith('/machines'))
      return response([{ serverNameEng: '2082', gpu: true }], false);
    if (path.endsWith('/query'))
      return response(
        {
          data: [row({ taskFinishTime: END / 1000 })],
          pagination: { totalItems: 1 },
        },
        false,
      );
    return response(snapshot, false);
  };
  const result = await loadRealGpuUsage(7, { now: END, fetcher });
  assert.equal(result.historicalRows, 1);
  assert.equal(result.servers[0].name, '2082');
  assert.ok(result.records.length > 0);
  assert.ok(paths.every((path) => path.startsWith('/web/')));
});
