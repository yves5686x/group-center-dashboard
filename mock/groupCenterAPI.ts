import { getRandomFloat, getRandomInt } from './FakeData/common';
import {
  realtimeMachineSeeds,
  wrapEnvelope,
} from './FakeData/realtimeFakeData';

/**
 * Group Center 后端常规接口的 mock。
 *
 * 形状严格对齐后端仓库（/Users/yves/code/web/group-center）真实响应，
 * 逐端点核对过 controller 与 DTO：
 *
 * | 端点                                  | 包装方式                       |
 * |---------------------------------------|-------------------------------|
 * | GET /web/open/gpu-tasks/query         | ClientResponse → data+pagination |
 * | GET /web/open/gpu-tasks/task/{taskId} | ClientResponse → GpuTaskInfoModel |
 * | GET /api/public/users                 | ClientResponse → [{name,nameEng}] |
 * | POST /api/public/projects/subscribe   | ClientResponse                 |
 * | POST /api/public/projects/unsubscribe | ClientResponse                 |
 * | GET  /api/public/projects/subscriptions | ClientResponse → {userName,subscriptions,count} |
 * | GET /api/machine/status               | 裸数组，无包装                  |
 * | GET /api/machine/status/summary       | 裸对象，无包装                  |
 * | GET /api/proxy/servers                | {success,message,servers,…}    |
 * | GET /api/proxy/status                 | {success,message,status,…}     |
 * | GET /version                          | 纯文本 text/plain              |
 *
 * 易错点（照后端 Jackson 序列化还原）：
 * - 布尔字段保留 is 前缀：isGpu / isMultiGpu / isAvailable / isSucceed；
 * - 分页字段是 currentPage / totalPages / totalItems，不是 page / total；
 * - machine status 与 proxy 的包装字段不同：前者无包装，后者 success/message；
 * - /version 是纯文本，不是 JSON。
 */

// ---------------------------------------------------------------------------
// 基础数据
// ---------------------------------------------------------------------------

// 与后端 version.properties 保持一致
const SERVER_VERSION = '1.8.8';

const userPool = [
  { name: '石峻昊', nameEng: 'ShiJunhao' },
  { name: '孔昊民', nameEng: 'KongHaomin' },
  { name: '张三', nameEng: 'ZhangSan' },
  { name: '李四', nameEng: 'LiSi' },
  { name: '王五', nameEng: 'WangWu' },
];

const projectPool = ['sjh2', 'StableDiffusion', 'llm-finetune', 'cv-detect'];
const pyFilePool = [
  'train00.py',
  'train_network.py',
  'finetune.py',
  'detect.py',
];
const condaPool = ['yolo', 'py38', 'torch21', 'base'];
const taskTypePool = ['TRAINING', 'INFERENCE', 'TESTING'];
const taskStatusPool = ['RUNNING', 'COMPLETED', 'FAILED'];

const nowSeconds = () => Math.floor(Date.now() / 1000);

const formatDuration = (seconds: number) => {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天${h}时${m}分`;
  if (h > 0) return `${h}时${m}分`;
  return `${m}分`;
};

// ---------------------------------------------------------------------------
// GPU 任务查询
// ---------------------------------------------------------------------------

/** 与后端 GpuTaskInfoModel 对齐的单条记录 */
interface MockGpuTask extends Record<string, any> {
  id: number;
  taskId: string;
}

// 固定生成一批任务（模块加载时确定，进程内不变），数量足够翻页
const TOTAL_TASKS = 57;
const mockTasks: MockGpuTask[] = [];

for (let i = 0; i < TOTAL_TASKS; i++) {
  const seed = realtimeMachineSeeds[i % realtimeMachineSeeds.length];
  const user = userPool[i % userPool.length];
  const projectName = projectPool[i % projectPool.length];
  const pyFileName = pyFilePool[i % pyFilePool.length];
  const condaEnvName = condaPool[i % condaPool.length];
  const taskType = taskTypePool[i % 3];
  // 最后 6 条是 RUNNING，其余 COMPLETED / FAILED，方便测状态筛选
  const isRunning = i >= TOTAL_TASKS - 6;
  const taskStatus = isRunning ? 'RUNNING' : taskStatusPool[1 + (i % 2)];
  const isMultiGpu = i % 7 === 3;
  const isDebugMode = i % 11 === 5;
  const runSeconds = isRunning
    ? getRandomInt(86400, 600)
    : getRandomInt(86400 * 3, 1800);
  const startSeconds =
    nowSeconds() -
    (isRunning ? runSeconds : getRandomInt(86400 * 14, 3600)) -
    i * 3600;
  const finishSeconds = isRunning ? 0 : startSeconds + runSeconds;
  const gpuMemoryTotalGb = +(seed.memoryTotalMb / 1024).toFixed(1);
  const gpuMemoryUsedGb = +getRandomFloat(
    gpuMemoryTotalGb * 0.9,
    0.5,
    2,
  ).toFixed(2);
  const worldSize = isMultiGpu ? seed.gpuCount : 1;

  mockTasks.push({
    id: 477001 + i,
    serverName: seed.serverName,
    serverNameEng: seed.serverNameEng,
    taskId: `task-${seed.serverNameEng}-${1000 + i}`,
    messageType: 'GPU_TASK',
    taskType,
    taskStatus,
    taskUser: user.name,
    taskPid: 2044750 + i * 137,
    taskMainMemory: getRandomInt(32768, 2048),
    gpuUsagePercent: +getRandomFloat(99, 0, 1).toFixed(1),
    gpuMemoryUsageString: `${gpuMemoryUsedGb.toFixed(2)}GiB`,
    gpuMemoryFreeString: `${(gpuMemoryTotalGb - gpuMemoryUsedGb).toFixed(2)}GiB`,
    gpuMemoryTotalString: `${gpuMemoryTotalGb.toFixed(2)}GiB`,
    gpuMemoryPercent: +((gpuMemoryUsedGb / gpuMemoryTotalGb) * 100).toFixed(1),
    taskGpuId: i % Math.max(seed.gpuCount, 1),
    taskGpuName: seed.gpuName,
    taskGpuMemoryGb: gpuMemoryUsedGb,
    taskGpuMemoryHuman: `${(gpuMemoryUsedGb * 1024).toFixed(0)}MiB`,
    taskGpuMemoryMaxGb: gpuMemoryTotalGb,
    isMultiGpu,
    multiDeviceLocalRank: isMultiGpu ? i % worldSize : 0,
    multiDeviceWorldSize: worldSize,
    topPythonPid: isMultiGpu ? 12345 + i : -1,
    cudaRoot: '/usr/local/cuda',
    cudaVersion: '12.4.1',
    isDebugMode,
    // 后端是秒级时间戳（前端 TaskResultTable 已做秒/毫秒兼容）
    taskStartTime: startSeconds,
    taskFinishTime: finishSeconds,
    taskStartTimeObj: new Date(startSeconds * 1000).toISOString(),
    taskFinishTimeObj: new Date(finishSeconds * 1000).toISOString(),
    taskRunningTimeString: formatDuration(
      (isRunning ? nowSeconds() : finishSeconds) - startSeconds,
    ),
    taskRunningTimeInSeconds:
      (isRunning ? nowSeconds() : finishSeconds) - startSeconds,
    projectDirectory: `/mnt/nvme0/data/${projectName}`,
    projectName,
    screenSessionName: `sess-${i}`,
    pyFileName,
    pythonVersion: '3.8.18',
    commandLine: `python /home/${user.nameEng}/${projectName}/${pyFileName} --epochs 200`,
    condaEnvName,
    totalGpuCount: seed.gpuCount,
  });
}

const likeMatch = (value: string, pattern?: string) =>
  !pattern || value.toLowerCase().includes(pattern.toLowerCase());

const applySort = (
  list: MockGpuTask[],
  sortBy?: string,
  sortOrder?: string,
) => {
  const column =
    (
      {
        ID: 'id',
        TASK_USER: 'taskUser',
        PROJECT_NAME: 'projectName',
        SERVER_NAME_ENG: 'serverNameEng',
        TASK_START_TIME: 'taskStartTime',
        TASK_FINISH_TIME: 'taskFinishTime',
        TASK_RUNNING_TIME_IN_SECONDS: 'taskRunningTimeInSeconds',
        GPU_USAGE_PERCENT: 'gpuUsagePercent',
        GPU_MEMORY_PERCENT: 'gpuMemoryPercent',
        TASK_GPU_MEMORY_GB: 'taskGpuMemoryGb',
      } as Record<string, string>
    )[sortBy || 'TASK_START_TIME'] || 'taskStartTime';
  const dir = (sortOrder || 'DESC') === 'ASC' ? 1 : -1;
  return [...list].sort((a, b) =>
    a[column] > b[column] ? dir : a[column] < b[column] ? -dir : 0,
  );
};

// 设置 GROUP_CENTER_API_MOCK=none 可单独关闭本文件的 mock，让这些端点
// 走真实后端代理；/web/open/realtime/** 的 mock（realtimeAPI.ts）不受影响，
// 便于在后端聚合层尚未部署时做「混合模式」联调。
const mocksEnabled = process.env.GROUP_CENTER_API_MOCK !== 'none';

export default mocksEnabled
  ? {
      // ---- GPU 任务查询（分页 + 筛选 + 排序） ----
      'GET /web/open/gpu-tasks/query': (req: any, res: any) => {
        const q = req.query;
        let list = mockTasks.filter((t) => {
          if (q.userName && t.taskUser !== q.userName) return false;
          if (!likeMatch(t.projectName, q.projectName)) return false;
          if (q.deviceName && t.serverNameEng !== q.deviceName) return false;
          if (q.taskType && t.taskType !== q.taskType) return false;
          if (q.isMultiGpu !== undefined && q.isMultiGpu !== '') {
            const want = q.isMultiGpu === 'true' || q.isMultiGpu === true;
            if (t.isMultiGpu !== want) return false;
          }
          if (
            q.startTime &&
            t.taskStartTime * 1000 < new Date(q.startTime).getTime()
          )
            return false;
          if (q.endTime && t.taskFinishTime > 0) {
            if (t.taskFinishTime * 1000 > new Date(q.endTime).getTime())
              return false;
          }
          return true;
        });

        list = applySort(list, q.sortBy, q.sortOrder);

        const page = Math.max(parseInt(q.page || '1', 10), 1);
        const pageSize = Math.max(parseInt(q.pageSize || '20', 10), 1);
        const start = (page - 1) * pageSize;
        const totalPages = Math.ceil(list.length / pageSize);

        res.json(
          wrapEnvelope({
            data: list.slice(start, start + pageSize),
            pagination: {
              currentPage: page,
              pageSize,
              totalPages,
              totalItems: list.length,
            },
            statistics: null,
          }),
        );
      },

      // ---- 按 taskId 查任务详情（订阅管理里的「任务详情」弹窗用） ----
      'GET /web/open/gpu-tasks/task/:taskId': (req: any, res: any) => {
        const task = mockTasks.find((t) => t.taskId === req.params.taskId);
        if (!task) {
          res.json({
            ...wrapEnvelope(`未找到任务: ${req.params.taskId}`),
            haveError: true,
            isSucceed: false,
          });
          return;
        }
        res.json(wrapEnvelope(task));
      },

      // ---- 用户列表（高级管理 / 订阅管理） ----
      'GET /api/public/users': (req: any, res: any) => {
        res.json(wrapEnvelope(userPool));
      },

      // ---- 项目订阅（进程内可增删，刷新即还原） ----
      'GET /api/public/projects/subscriptions': (req: any, res: any) => {
        const userName = req.query.userName || '';
        res.json(
          wrapEnvelope({
            userName,
            subscriptions: subscriptions.get(userName) || [],
            count: (subscriptions.get(userName) || []).length,
          }),
        );
      },

      'POST /api/public/projects/subscribe': (req: any, res: any) => {
        const { userName, projectId } = req.body || {};
        const list = subscriptions.get(userName) || [];
        if (!list.includes(projectId)) list.push(projectId);
        subscriptions.set(userName, list);
        res.json(wrapEnvelope(`订阅成功: ${userName} -> ${projectId}`));
      },

      'POST /api/public/projects/unsubscribe': (req: any, res: any) => {
        const { userName, projectId } = req.body || {};
        const list = (subscriptions.get(userName) || []).filter(
          (id: string) => id !== projectId,
        );
        subscriptions.set(userName, list);
        res.json(wrapEnvelope(`取消订阅成功: ${userName} -> ${projectId}`));
      },

      // ---- 机器状态（后端无包装，直接裸数组 / 裸对象） ----
      'GET /api/machine/status': (req: any, res: any) => {
        res.json(generateMachineStatusList());
      },

      'GET /api/machine/status/summary': (req: any, res: any) => {
        const list = generateMachineStatusList();
        const totalMachines = list.length;
        const onlinePingCount = list.filter((m) => m.pingStatus).length;
        const onlineAgentCount = list.filter((m) => m.agentStatus).length;
        res.json({
          totalMachines,
          onlinePingCount,
          onlineAgentCount,
          pingOnlineRate: `${((onlinePingCount / totalMachines) * 100).toFixed(2)}%`,
          agentOnlineRate: `${((onlineAgentCount / totalMachines) * 100).toFixed(2)}%`,
          lastUpdateTime: nowSeconds(),
        });
      },

      // ---- 代理服务器（本控制器自定义包装 success/message） ----
      'GET /api/proxy/servers': (req: any, res: any) => {
        const servers = generateProxyServers();
        res.json({
          success: true,
          message: '获取代理测试服务器列表成功',
          servers,
          totalCount: servers.length,
          availableCount: servers.filter((s) => s.isAvailable).length,
        });
      },

      'GET /api/proxy/status': (req: any, res: any) => {
        const servers = generateProxyServers();
        const available = servers.filter((s) => s.isAvailable);
        res.json({
          success: true,
          message: 'Get proxy status successfully',
          status: {
            totalProxies: servers.length,
            availableProxies: available.length,
            availabilityRate: `${((available.length / servers.length) * 100).toFixed(2)}%`,
            averageResponseTime: Math.round(
              available.reduce((sum, s) => sum + (s.responseTime || 0), 0) /
                Math.max(available.length, 1),
            ),
            lastCheckTime: nowSeconds(),
            isConfigEnabled: true,
            summaryDescription: '模拟的代理池状态',
          },
          configEnabled: true,
          configFileExists: true,
        });
      },

      // ---- 版本：后端直接返回纯文本（StringHttpMessageConverter） ----
      'GET /version': (req: any, res: any) => {
        res.type('text/plain').send(SERVER_VERSION);
      },
    }
  : {};

// ---------------------------------------------------------------------------
// 辅助生成器
// ---------------------------------------------------------------------------

/** 订阅数据：userName -> projectId[] */
const subscriptions = new Map<string, string[]>([
  ['石峻昊', ['sjh2', 'llm-finetune']],
]);

/** 与 realtimeFakeData 的机器种子保持一致，硬件状态按种子设定还原 */
const generateMachineStatusList = () =>
  realtimeMachineSeeds.map((seed, index) => {
    const pingStatus = index % 5 !== 4; // 每第 5 台 Ping 失败
    // Agent 状态以种子的 agentOnline 为准；storage-01 非 GPU 机器也照常输出
    const agentStatus = seed.agentOnline;
    const lastPing = pingStatus ? nowSeconds() - getRandomInt(120, 10) : 0;
    const fmt = (ts: number) =>
      ts > 0
        ? new Date(ts * 1000).toLocaleString('zh-CN', { hour12: false })
        : null;
    return {
      name: seed.serverName,
      nameEng: seed.serverNameEng,
      host: `192.168.1.${100 + index}`,
      position: seed.position,
      isGpu: seed.gpu,
      pingStatus,
      agentStatus,
      lastPingTime: lastPing,
      lastHeartbeatTime: agentStatus
        ? nowSeconds() - getRandomInt(120, 10)
        : null,
      lastPingTimeFormatted: fmt(lastPing),
      lastHeartbeatTimeFormatted: agentStatus
        ? fmt(nowSeconds() - getRandomInt(120, 10))
        : null,
      pingStatusText: pingStatus ? '在线' : '离线',
      agentStatusText: agentStatus ? '在线' : '离线',
    };
  });

const generateProxyServers = () => {
  const base = {
    priority: 0,
    requiresAuth: false,
    healthCheckEnabled: true,
    healthCheckInterval: 300,
    healthCheckTimeout: 5,
    testUrls: ['https://www.google.com'],
  };
  return [
    {
      ...base,
      name: '校园代理A',
      nameEng: 'proxyA',
      type: 'HTTP',
      host: '10.0.0.11',
      port: 7890,
      enable: true,
      isAvailable: true,
      lastCheckTime: nowSeconds() - 60,
      responseTime: 230,
      successRate: '95.00%',
      totalChecks: 100,
      lastError: null,
      urlTestResults: [
        {
          url: 'https://www.google.com',
          name: '谷歌',
          nameEng: 'Google',
          isSuccess: true,
          responseTime: 230,
          statusCode: 200,
          error: null,
          testTime: nowSeconds() - 60,
        },
      ],
    },
    {
      ...base,
      name: '校园代理B',
      nameEng: 'proxyB',
      type: 'SOCKS5',
      host: '10.0.0.12',
      port: 1080,
      enable: true,
      isAvailable: false,
      lastCheckTime: nowSeconds() - 120,
      responseTime: 0,
      successRate: '42.00%',
      totalChecks: 100,
      lastError: 'Connection refused',
      urlTestResults: [
        {
          url: 'https://www.google.com',
          name: '谷歌',
          nameEng: 'Google',
          isSuccess: false,
          responseTime: 0,
          statusCode: 0,
          error: 'Connection refused',
          testTime: nowSeconds() - 120,
        },
      ],
    },
    {
      ...base,
      name: '已停用代理',
      nameEng: 'proxyDisabled',
      type: 'HTTP',
      host: '10.0.0.13',
      port: 8080,
      enable: false,
      isAvailable: false,
      lastCheckTime: null,
      responseTime: 0,
      successRate: '0.00%',
      totalChecks: 0,
      lastError: null,
      urlTestResults: [],
    },
  ];
};
