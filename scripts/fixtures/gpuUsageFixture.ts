import type { GpuUsageInterval } from '../../src/pages/Statistics/utils/gpuHours.ts';

// Fixed, reproducible sample records. No production queries or inferred DDP grouping.
export const PREVIEW_END = Date.parse('2026-10-23T12:00:00+08:00');
const HOUR = 3_600_000;
export const PREVIEW_SERVERS = [
  { name: '3090', model: 'RTX 3090', cards: 1 },
  { name: '2082', model: 'RTX 2080 Ti', cards: 2 },
  { name: '2084', model: 'RTX 2080 Ti', cards: 4 },
  { name: '4090A', model: 'RTX 4090', cards: 1 },
  { name: '4090B', model: 'RTX 4090', cards: 1 },
  { name: '4098A', model: 'RTX 4090', cards: 8 },
  { name: '4098B', model: 'RTX 4090', cards: 8 },
];
const users = ['用户甲', '用户乙', '用户丙', '用户丁', '用户戊'];
const projects = ['多光谱目标检测', '小目标分割', '场景文字识别', '模型微调'];

export const createUsageFixture = (): GpuUsageInterval[] => {
  const records: GpuUsageInterval[] = [];
  for (let day = 0; day < 30; day++) {
    PREVIEW_SERVERS.forEach((server, index) => {
      if ((day * 2 + index) % 7 === 0) return;
      const start = PREVIEW_END - (day * 24 + 4 + index) * HOUR;
      const duration = [2.5, 4, 7, 11, 3.5, 16, 9][(day + index) % 7] * HOUR;
      const cards = index > 4 && day % 2 ? 4 : server.cards;
      for (let gpu = 0; gpu < cards; gpu++) {
        const finish = start + duration;
        records.push({
          taskId: `sample-${day}-${server.name}`,
          user: users[(day + index) % users.length],
          project: projects[(day + index * 2) % projects.length],
          server: server.name,
          gpuId: String(gpu),
          model: server.model,
          start,
          finish: finish <= PREVIEW_END ? finish : undefined,
          lastObserved: Math.min(finish, PREVIEW_END - 2 * 60_000),
        });
      }
    });
  }
  // Two processes of one user sharing a card: card time is unioned, tasks are separate.
  records.push({
    taskId: 'sample-shared-card',
    user: '用户乙',
    project: '场景文字识别',
    server: '4090A',
    gpuId: '0',
    model: 'RTX 4090',
    start: PREVIEW_END - 6 * HOUR,
    finish: PREVIEW_END - 3 * HOUR,
    lastObserved: PREVIEW_END - 3 * HOUR,
  });
  // Incomplete historical interval is explicitly marked as an estimate.
  records.push({
    taskId: 'sample-estimated',
    user: '用户戊',
    project: '模型微调',
    server: '2084',
    gpuId: '3',
    model: 'RTX 2080 Ti',
    start: PREVIEW_END - 30 * HOUR,
    finish: PREVIEW_END - 28 * HOUR,
    lastObserved: PREVIEW_END - 28 * HOUR,
    estimated: true,
  });
  return records;
};
