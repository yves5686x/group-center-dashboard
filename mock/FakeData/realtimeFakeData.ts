import { getRandomFloat, getRandomInt } from './common';

/**
 * 实时聚合层的 mock 数据。
 *
 * 形状严格对齐本机后端 `/web/open/realtime/**` 的真实响应（serverVersion 1.8.8）。
 * 机器清单按实验室真实情况（2026-09-17 确认）：
 * 3090 + 1080Ti（1卡）、2082（2卡）、2084（4卡）、4090a（单卡）、
 * 4090b（单卡）、4098a（8卡）、4098b（8卡），全部 Agent 在线。
 * 降级形态（cache / last-known-good / none / 非GPU机器）如需 UI 测试，
 * 临时把某台的 gpuSource/diskSource 换掉即可。
 */

const SERVER_VERSION = '1.8.8-mock';

/** 统一信封 */
export const wrapEnvelope = <T>(result: T) => ({
  haveError: false,
  isAuthenticated: true,
  isSucceed: true,
  result,
  serverVersion: SERVER_VERSION,
});

interface MachineSeed {
  serverNameEng: string;
  serverName: string;
  position: string;
  gpu: boolean;
  hasApiUrl: boolean;
  agentOnline: boolean;
  gpuCount: number;
  /** GPU 快照的降级形态 */
  gpuSource: 'agent' | 'cache' | 'last-known-good' | 'none';
  diskSource: 'agent' | 'cache' | 'last-known-good' | 'none';
  /** 挂载点数量（不含系统盘） */
  diskCount: number;
  gpuName: string;
  memoryTotalMb: number;
  tdp: number;
  /** 是否在任务里带上聚合层尚未透出的遗留字段 */
  withLegacyTaskFields: boolean;
}

const machineSeeds: MachineSeed[] = [
  {
    serverNameEng: '3090',
    serverName: '3090 + 1080Ti',
    position: '科研楼509',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 1,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 1,
    gpuName: 'RTX 3090',
    memoryTotalMb: 24576,
    tdp: 350,
    withLegacyTaskFields: false,
  },
  {
    serverNameEng: '2082',
    serverName: '2080Ti x 2',
    position: '科研楼509',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 2,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 2,
    gpuName: 'RTX 2080 Ti',
    memoryTotalMb: 11264,
    tdp: 250,
    withLegacyTaskFields: false,
  },
  {
    serverNameEng: '2084',
    serverName: '2080Ti x 4',
    position: '科研楼309',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 4,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 2,
    gpuName: 'RTX 2080 Ti',
    memoryTotalMb: 11264,
    tdp: 250,
    withLegacyTaskFields: false,
  },
  {
    // 单卡机器（展示名与后端 Config/Machine/real.yaml 对齐）
    serverNameEng: '4090a',
    serverName: '4090A',
    position: '科研楼509',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 1,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 2,
    gpuName: 'RTX 4090',
    memoryTotalMb: 24564,
    tdp: 450,
    withLegacyTaskFields: false,
  },
  {
    // 单卡机器（展示名与后端 Config/Machine/real.yaml 对齐）
    serverNameEng: '4090b',
    serverName: '4090B',
    position: '科研楼509',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 1,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 2,
    gpuName: 'RTX 4090',
    memoryTotalMb: 24564,
    tdp: 450,
    withLegacyTaskFields: false,
  },
  {
    serverNameEng: '4098a',
    serverName: '8 x 4098A',
    position: '图书馆B710',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 8,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 3,
    gpuName: 'RTX 4090',
    memoryTotalMb: 24564,
    tdp: 450,
    withLegacyTaskFields: false,
  },
  {
    serverNameEng: '4098b',
    serverName: '8 x 4098B',
    position: '图书馆B710',
    gpu: true,
    hasApiUrl: true,
    agentOnline: true,
    gpuCount: 8,
    gpuSource: 'agent',
    diskSource: 'agent',
    diskCount: 3,
    gpuName: 'RTX 4090',
    memoryTotalMb: 24564,
    tdp: 450,
    // 这台机器带上遗留字段，用来验证「后端补齐后 UI 无需改动即可自动亮起」
    withLegacyTaskFields: true,
  },
];

const nowSeconds = () => Math.floor(Date.now() / 1000);

/** 各 source 对应的数据年龄（秒）与 stale */
const sourceMeta = (source: MachineSeed['gpuSource']) => {
  switch (source) {
    case 'agent':
      return { freshness: 0, stale: false, error: null as string | null };
    case 'cache':
      return {
        freshness: getRandomInt(4, 1),
        stale: false,
        error: null as string | null,
      };
    case 'last-known-good':
      return {
        freshness: getRandomInt(900, 300),
        stale: true,
        error: 'agent 请求超时，已回退到上一次成功的数据',
      };
    case 'none':
    default:
      return {
        freshness: -1,
        stale: true,
        error: '无法连接到该机器的 agent（connection refused）',
      };
  }
};

// ---------------------------------------------------------------------------
// 机器列表
// ---------------------------------------------------------------------------

export const generateRealtimeMachines = () => {
  return machineSeeds.map((seed) => {
    // 列表端点读的是缓存里的快照元信息，因此可能比详情端点更旧——
    // 这与真实后端的行为一致（实测 /machines 说 stale=true，详情却是 agent）。
    const meta = sourceMeta(seed.gpuSource);
    const hasSnapshot = seed.gpuSource !== 'none' && seed.hasApiUrl;

    return {
      serverNameEng: seed.serverNameEng,
      serverName: seed.serverName,
      position: seed.position,
      gpu: seed.gpu,
      hasApiUrl: seed.hasApiUrl,
      agentOnline: seed.agentOnline,
      snapshotTime: hasSnapshot ? nowSeconds() - meta.freshness : 0,
      freshness: hasSnapshot ? meta.freshness : -1,
      stale: hasSnapshot ? meta.stale : true,
    };
  });
};

// ---------------------------------------------------------------------------
// GPU 快照
// ---------------------------------------------------------------------------

const userPool = ['石峻昊', '孔昊民', '张三', '李四', '王五'];
const projectPool = ['sjh2', 'StableDiffusion', 'llm-finetune', 'cv-detect'];
const pyFilePool = [
  'train00.py',
  'train_network.py',
  'finetune.py',
  'detect.py',
];
const condaPool = ['yolo', 'py38', 'torch21', 'base'];
const screenPool = ['sjh', 'sd', 'llm', ''];

/** 生成一个任务。startTimestamp 是毫秒级（与快照的秒级字段不同） */
const generateTask = (
  seed: MachineSeed,
  gpuId: number,
  index: number,
  worldSize: number = 0,
  localRank: number = 0,
) => {
  const runSeconds = getRandomInt(300000, 600);
  const gpuMemoryUsageMax = Math.round(seed.memoryTotalMb * 0.97);
  const gpuMemoryUsage = getRandomFloat(gpuMemoryUsageMax, 1024, 1);

  const task: any = {
    pid: 2044750 + index * 137 + gpuId,
    name: userPool[index % userPool.length],
    projectName: projectPool[index % projectPool.length],
    pyFileName: pyFilePool[index % pyFilePool.length],
    command: `python /home/${userPool[index % userPool.length]}/${
      projectPool[index % projectPool.length]
    }/${pyFilePool[index % pyFilePool.length]} --epochs 200`,
    condaEnv: condaPool[index % condaPool.length],
    screenSessionName: screenPool[index % screenPool.length],
    runTime: `${Math.floor(runSeconds / 3600)}:${String(
      Math.floor((runSeconds % 3600) / 60),
    ).padStart(2, '0')}:${String(runSeconds % 60).padStart(2, '0')}`,
    // ★ 毫秒级
    startTimestamp: Date.now() - runSeconds * 1000,
    gpuMemoryUsage,
    gpuMemoryUsageMax,
    cpuPercent: getRandomFloat(800, 10, 1),
    gpuUtilization: getRandomFloat(100, 0, 1),
    worldSize,
    localRank,
  };

  // 只有部分机器带上聚合层尚未透出的遗留字段，用来验证两种情况都不崩
  if (seed.withLegacyTaskFields) {
    Object.assign(task, {
      id: 477998 + index,
      debugMode: index % 4 === 0,
      projectDirectory: `/mnt/nvme0/data/${task.projectName}`,
      multiprocessingSpawn: index % 5 === 0,
      topPythonPid: 12345 + index,
      pythonBinPath: `/opt/conda/envs/${task.condaEnv}/bin/python`,
      pythonVersion: '3.8.18',
      torchVersion: '2.1.0',
      torchCudaVersion: '12.1',
      mainName: task.pyFileName,
      taskMainMemoryMB: getRandomInt(32768, 1024),
      cudaRoot: '/usr/local/cuda',
      cudaVersion: '12.4.1',
      cudaVisibleDevices: String(gpuId),
      driverVersion: '550.90.07',
      userEnvEpoch: index % 3 === 0 ? '2026-09-01' : '',
      zeroTotalGpuAlertCount: 0,
      zeroTotalCpuAlertCount: 0,
      zeroAlreadyAlertedGpuUsage: false,
      // 造一个 CPU 空占用告警，验证告警标签
      zeroAlreadyAlertedCpuUsage: index % 3 === 0,
      zeroMaxConsecutiveCount: 12,
      zeroDetectionIntervalSeconds: 60,
    });
  }

  return task;
};

const generateCard = (seed: MachineSeed, gpuId: number, taskCount: number) => {
  const tasks: any[] = [];
  for (let i = 0; i < taskCount; i++) {
    tasks.push(generateTask(seed, gpuId, i));
  }

  const memoryUsage = taskCount > 0 ? getRandomFloat(97, 20, 1) : 0;
  const coreUsage = taskCount > 0 ? getRandomFloat(100, 30, 1) : 0;

  return {
    gpuId,
    gpuName: seed.gpuName,
    coreUsage,
    memoryUsage,
    memoryTotal: `${(seed.memoryTotalMb / 1024).toFixed(2)}GiB`,
    memoryTotalMb: seed.memoryTotalMb,
    powerUsage:
      taskCount > 0
        ? getRandomFloat(seed.tdp, seed.tdp * 0.3, 1)
        : getRandomFloat(30, 10, 1),
    tdp: seed.tdp,
    temperature:
      taskCount > 0 ? getRandomFloat(82, 45, 1) : getRandomFloat(40, 28, 1),
    hasData: true,
    tasks,
  };
};

export const generateRealtimeGpuSnapshot = (serverNameEng: string) => {
  const seed = machineSeeds.find((m) => m.serverNameEng === serverNameEng);

  // 未知机器名：实测后端是「HTTP 200 + isSucceed:true + source:'none'」，
  // 错误写在业务体的 error 里（见迁移文档 3.1）。这里必须照原样还原，
  // 否则 mock 会用信封级失败掩盖掉这条降级路径，测不到真实表现。
  if (!seed) {
    return wrapEnvelope({
      serverNameEng,
      serverName: serverNameEng,
      agentOnline: false,
      gpuCount: 0,
      snapshotTime: 0,
      serverTime: nowSeconds(),
      freshness: -1,
      stale: true,
      source: 'none' as const,
      error: `unknown machine: ${serverNameEng}`,
      snapshot: [],
    });
  }

  const meta = sourceMeta(seed.gpuSource);
  const snapshotTime =
    seed.gpuSource === 'none' ? 0 : nowSeconds() - meta.freshness;

  const snapshot: any[] = [];
  if (seed.gpuSource !== 'none') {
    for (let gpuId = 0; gpuId < seed.gpuCount; gpuId++) {
      let taskCount = 0;

      if (seed.serverNameEng === '3090') {
        taskCount = 1;
      } else if (seed.serverNameEng === '4098a') {
        // 8 卡全空闲，对应真实后端当前的形态
        taskCount = 0;
      } else if (seed.serverNameEng === '4098b') {
        // 前 4 张卡跑同一个 DDP 任务（worldSize=4），后 4 张空闲
        taskCount = gpuId < 4 ? 1 : 0;
      } else {
        taskCount = getRandomInt(2, 0);
      }

      const card = generateCard(seed, gpuId, taskCount);

      // 4098b 的前 4 张卡标记为多卡任务
      if (seed.serverNameEng === '4098b' && gpuId < 4 && card.tasks[0]) {
        card.tasks[0].worldSize = 4;
        card.tasks[0].localRank = gpuId;
        card.tasks[0].gpuUtilization = getRandomFloat(100, 85, 1);
        if (seed.withLegacyTaskFields) {
          card.tasks[0].topPythonPid = 999001;
        }
      }

      snapshot.push(card);
    }
  }

  return wrapEnvelope({
    serverNameEng: seed.serverNameEng,
    serverName: seed.serverName,
    agentOnline: seed.agentOnline,
    gpuCount: seed.gpuSource === 'none' ? 0 : seed.gpuCount,
    // ★ 秒级
    snapshotTime,
    serverTime: nowSeconds(),
    freshness: meta.freshness,
    stale: meta.stale,
    source: seed.gpuSource,
    error: meta.error,
    snapshot,
  });
};

// ---------------------------------------------------------------------------
// 磁盘 + 内存快照
// ---------------------------------------------------------------------------

const generateMount = (mountPoint: string, isSystem: boolean) => {
  const totalGb = isSystem ? 457 : getRandomInt(8192, 916);
  const usedPercentage = getRandomInt(95, 20);
  const usedGb = Math.round((totalGb * usedPercentage) / 100);
  const freeGb = totalGb - usedGb;

  return {
    mountPoint,
    usedPercentage: Number(usedPercentage.toFixed(1)),
    usedStr: `${usedGb}G`,
    freeStr: `${freeGb}G`,
    totalStr: `${totalGb}G`,
    type: isSystem ? 'UNKNOWN' : 'HDD',
    purpose: isSystem ? '系统盘' : '数据盘',
    triggerHighPercentageUsed: usedPercentage >= 85,
    triggerLowFreeBytes: freeGb < 100,
    triggerSizeWarning: usedPercentage >= 95,
  };
};

export const generateRealtimeDiskSnapshot = (serverNameEng: string) => {
  const seed = machineSeeds.find((m) => m.serverNameEng === serverNameEng);

  // 未知机器名：同 gpu，后端是「HTTP 200 + source:'none'」，不是信封级失败。
  if (!seed) {
    return wrapEnvelope({
      serverNameEng,
      serverName: serverNameEng,
      agentOnline: false,
      snapshotTime: 0,
      serverTime: nowSeconds(),
      freshness: -1,
      stale: true,
      source: 'none' as const,
      error: `unknown machine: ${serverNameEng}`,
      snapshot: [],
      system: null,
    });
  }

  const meta = sourceMeta(seed.diskSource);
  const snapshotTime =
    seed.diskSource === 'none' ? 0 : nowSeconds() - meta.freshness;

  const snapshot: any[] = [];
  if (seed.diskSource !== 'none') {
    snapshot.push(generateMount('/', true));
    for (let i = 1; i <= seed.diskCount; i++) {
      snapshot.push(generateMount(`/mnt/hdd${i}`, false));
    }
  }

  // system 可能为 null，storage-01 就故意给 null 验证前端不会崩
  const system =
    seed.diskSource === 'none' || seed.serverNameEng === 'storage-01'
      ? null
      : {
          memoryPhysicTotalMb: seed.serverNameEng === '3090' ? 64194 : 131072,
          memoryPhysicUsedMb: getRandomInt(60000, 8000),
          memorySwapTotalMb: 2047,
          memorySwapUsedMb: getRandomInt(512, 0),
        };

  return wrapEnvelope({
    serverNameEng: seed.serverNameEng,
    serverName: seed.serverName,
    agentOnline: seed.agentOnline,
    snapshotTime,
    serverTime: nowSeconds(),
    freshness: meta.freshness,
    stale: meta.stale,
    source: seed.diskSource,
    error: meta.error,
    snapshot,
    system,
  });
};

export const realtimeMachineSeeds = machineSeeds;
