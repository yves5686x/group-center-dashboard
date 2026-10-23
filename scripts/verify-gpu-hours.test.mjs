import assert from 'node:assert/strict';
import test from 'node:test';
import {
  dailyUsage,
  groupUsage,
  summarizeUsage,
} from '../src/pages/Statistics/utils/gpuHours.ts';

const HOUR = 3_600_000;
const period = { start: 0, end: 24 * HOUR };
const record = (patch = {}) => ({
  taskId: 'job-1',
  user: 'user-1',
  project: 'project-1',
  server: '2082',
  gpuId: '0',
  model: 'RTX 2080 Ti',
  start: 0,
  finish: 10 * HOUR,
  lastObserved: 10 * HOUR,
  ...patch,
});

test('two-card DDP: 20 GPU hours, 10 task hours and one logical task', () => {
  const result = summarizeUsage([record(), record({ gpuId: '1' })], period);
  assert.equal(result.gpuHours, 20);
  assert.equal(result.taskHours, 10);
  assert.equal(result.taskCount, 1);
});

test('eight rank records are summed once, with no second world-size multiplier', () => {
  const ranks = Array.from({ length: 8 }, (_, i) =>
    record({ gpuId: String(i), finish: 3 * HOUR }),
  );
  const result = summarizeUsage(ranks, period);
  assert.equal(result.gpuHours, 24);
  assert.equal(result.taskHours, 3);
  assert.equal(result.taskCount, 1);
});

test('duplicate observations and overlapping processes do not inflate physical card hours', () => {
  const rows = [
    record(),
    record(),
    record({ taskId: 'job-2', start: 5 * HOUR, finish: 12 * HOUR }),
  ];
  const result = summarizeUsage(rows, period);
  assert.equal(result.gpuHours, 12);
  assert.equal(result.taskHours, 17);
  assert.equal(result.taskCount, 2);
});

test('time clipping includes only the selected window', () => {
  const result = summarizeUsage(
    [record({ start: -10 * HOUR, finish: 4 * HOUR })],
    { start: 2 * HOUR, end: 3 * HOUR },
  );
  assert.equal(result.gpuHours, 1);
  assert.equal(result.taskHours, 1);
  assert.equal(
    summarizeUsage([record()], { start: 12 * HOUR, end: 24 * HOUR }).taskCount,
    0,
  );
});

test('running or offline tasks stop at last reliable observation', () => {
  const result = summarizeUsage(
    [record({ finish: undefined, lastObserved: 2 * HOUR })],
    period,
  );
  assert.equal(result.gpuHours, 2);
  assert.equal(result.taskHours, 2);
});

test('changing GPU count is integrated across actual intervals', () => {
  const rows = [
    record({ finish: 2 * HOUR }),
    record({ gpuId: '1', start: HOUR, finish: 2 * HOUR }),
  ];
  assert.equal(summarizeUsage(rows, period).gpuHours, 3);
  assert.equal(summarizeUsage(rows, period).taskHours, 2);
});

test('shared-user attribution can overlap while server totals are unioned', () => {
  const rows = [record(), record({ taskId: 'job-2', user: 'user-2' })];
  assert.equal(summarizeUsage(rows, period).gpuHours, 10);
  assert.equal(
    groupUsage(rows, period, 'user').reduce(
      (sum, user) => sum + user.gpuHours,
      0,
    ),
    20,
  );
  assert.equal(groupUsage(rows, period, 'server')[0].gpuHours, 10);
});

test('GPU zero on different servers refers to different physical cards', () => {
  const rows = [record(), record({ server: '2084', taskId: 'job-2' })];
  assert.equal(summarizeUsage(rows, period).gpuHours, 20);
  assert.equal(groupUsage(rows, period, 'server').length, 2);
});

test('calendar-day breakdown uses Shanghai midnight and conserves hours', () => {
  const start = Date.parse('2026-10-22T23:00:00+08:00');
  const end = Date.parse('2026-10-23T02:00:00+08:00');
  const rows = [record({ start, finish: end, lastObserved: end })];
  const days = dailyUsage(rows, { start, end });
  assert.deepEqual(
    days.map((d) => [d.date, d.gpuHours]),
    [
      ['2026-10-22', 1],
      ['2026-10-23', 2],
    ],
  );
  assert.equal(
    days.reduce((sum, d) => sum + d.gpuHours, 0),
    summarizeUsage(rows, { start, end }).gpuHours,
  );
});

test('invalid, unidentifiable and zero-length intervals are excluded', () => {
  const rows = [
    record({ start: NaN }),
    record({ gpuId: '' }),
    record({ finish: 0 }),
    record({ start: 20 * HOUR }),
  ];
  assert.equal(summarizeUsage(rows, period).taskCount, 0);
});

test('estimated intervals are visibly distinguishable and favorites follow card hours', () => {
  const rows = [
    record({ estimated: true }),
    record({ server: '2084', taskId: 'job-2', finish: 12 * HOUR }),
  ];
  const user = groupUsage(rows, period, 'user')[0];
  assert.equal(user.estimated, true);
  assert.equal(user.favoriteServer, '2084');
});

// A month of overlapping, multi-card, shared-card and cross-day records.
test('complete fixture conserves physical GPU hours across servers and Shanghai days', async () => {
  const { createUsageFixture, PREVIEW_END } =
    await import('./fixtures/gpuUsageFixture.ts');
  const records = createUsageFixture();
  const window = { start: PREVIEW_END - 30 * 24 * HOUR, end: PREVIEW_END };
  const total = summarizeUsage(records, window).gpuHours;
  const servers = groupUsage(records, window, 'server');
  const days = dailyUsage(records, window);
  assert.equal(servers.length, 7);
  assert.ok(total > 0);
  assert.ok(
    Math.abs(servers.reduce((n, row) => n + row.gpuHours, 0) - total) < 1e-8,
  );
  assert.ok(
    Math.abs(days.reduce((n, row) => n + row.gpuHours, 0) - total) < 1e-8,
  );
});
