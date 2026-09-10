/**
 * 实时数据同源聚合层类型定义。
 *
 * 对应后端 `/web/open/realtime/**` 三个只读端点，数据由 group-center 统一
 * pull agent 并做 5s TTL 缓存，前端不再直连 agent。
 *
 * 注意：本文件为手写维护（`npm run openapi` 只覆盖 typings.d.ts 与各
 * controller 文件）。后端 DTO 若发生字段变更，需要同步这里。
 *
 * ★ 时间戳单位约定（后端混用，切勿搞错）：
 *   - snapshotTime / serverTime / freshness 为 **秒级**
 *   - tasks[].startTimestamp 为 **毫秒级**
 */
declare namespace API {
  /** 统一响应信封，业务数据在 result 里 */
  type RealtimeClientResponse<T> = {
    haveError: boolean;
    isAuthenticated: boolean;
    /** Kotlin 的 isSucceed 可能被 Jackson 序列化成 succeed，两者都要兼容 */
    isSucceed?: boolean;
    succeed?: boolean;
    result?: T;
    serverVersion: string;
  };

  /**
   * 数据来源。
   * - `agent`：本次实拉成功
   * - `cache`：命中 5s TTL 缓存
   * - `last-known-good`：拉取失败，回退到上一次成功的数据（应标记为过期）
   * - `none`：从未取到数据 / 机器不可达
   */
  type RealtimeSource = 'agent' | 'cache' | 'last-known-good' | 'none';

  /** GET /web/open/realtime/machines 的 result 数组项 */
  type RealtimeMachine = {
    /** 机器英文标识，作为 /gpu、/disk 两个端点的路径参数 */
    serverNameEng: string;
    /** 展示名（等价于旧接口的 machineName） */
    serverName: string;
    position: string;
    /** 是否为 GPU 服务器。JSON key 是 gpu，不是 isGpu */
    gpu: boolean;
    /** 是否配置了 agent 地址 */
    hasApiUrl: boolean;
    /** 心跳判定的在线状态，与「能否取到实时数据」相互独立 */
    agentOnline: boolean;
    /** 已缓存快照时间，秒级；0 表示从无 */
    snapshotTime: number;
    /** 数据年龄，秒；-1 表示无数据 */
    freshness: number;
    /** 是否过期（agent 宕机回退旧数据、或从无数据） */
    stale: boolean;
  };

  /**
   * 单张 GPU 卡上的一个任务。
   *
   * 前 15 个字段由聚合层提供；后半部分为旧 agent 直连通道遗留字段，
   * 聚合层目前 **尚未透出**，因此全部可选。UI 侧一律用 VShow / 可选链
   * 做防御，后端补齐后无需改前端即可自动亮起。
   */
  type RealtimeGpuTask = {
    pid: number;
    /** 任务归属人 */
    name: string;
    projectName: string;
    pyFileName: string;
    command: string;
    condaEnv: string;
    screenSessionName: string;
    /** 后端已格式化的运行时长，形如 "70:57:31" */
    runTime: string;
    /** ★ 毫秒级时间戳（与快照的秒级字段不同） */
    startTimestamp: number;
    /** 当前显存占用，MB */
    gpuMemoryUsage: number;
    /** 最大显存占用，MB */
    gpuMemoryUsageMax: number;
    cpuPercent: number;
    gpuUtilization: number;
    worldSize: number;
    localRank: number;

    // ↓↓↓ 以下为聚合层暂未透出的字段，详见 Doc/dev 的待补清单 ↓↓↓

    /** 任务 ID，订阅项目功能依赖它 */
    id?: number;
    debugMode?: boolean;
    projectDirectory?: string;
    multiprocessingSpawn?: boolean;
    /** 多卡任务的主进程 PID，用于给同一个多卡任务分配同一种标签颜色 */
    topPythonPid?: number;
    pythonBinPath?: string;
    pythonVersion?: string;
    torchVersion?: string;
    torchCudaVersion?: string;
    mainName?: string;
    taskMainMemoryMB?: number;
    cudaRoot?: string;
    cudaVersion?: string;
    cudaVisibleDevices?: string;
    driverVersion?: string;
    userEnvEpoch?: string;
    /** 零占用率监控相关 */
    zeroTotalGpuAlertCount?: number;
    zeroTotalCpuAlertCount?: number;
    zeroAlreadyAlertedGpuUsage?: boolean;
    zeroAlreadyAlertedCpuUsage?: boolean;
    zeroMaxConsecutiveCount?: number;
    zeroDetectionIntervalSeconds?: number;
  };

  /** 单张 GPU 卡的实时快照。空闲卡也会出现在数组里（coreUsage≈0、tasks=[]） */
  type RealtimeGpuCard = {
    gpuId: number;
    gpuName: string;
    /** 核心利用率 % */
    coreUsage: number;
    /** 显存占用 % */
    memoryUsage: number;
    /** 显存总量字符串，形如 "24.00GiB" */
    memoryTotal: string;
    memoryTotalMb: number;
    powerUsage: number;
    tdp: number;
    temperature: number;
    /** 该卡是否成功取到数据 */
    hasData: boolean;
    tasks: RealtimeGpuTask[];
  };

  /** GET /web/open/realtime/machines/{serverNameEng}/gpu 的 result */
  type RealtimeGpuSnapshot = {
    serverNameEng: string;
    serverName: string;
    agentOnline: boolean;
    gpuCount: number;
    /** 秒级 */
    snapshotTime: number;
    /** 秒级 */
    serverTime: number;
    /** 秒；= serverTime - snapshotTime */
    freshness: number;
    stale: boolean;
    source: RealtimeSource;
    error: string | null;
    /** 每张卡一项，长度 = gpuCount（含空闲卡） */
    snapshot: RealtimeGpuCard[];
  };

  /** 单个磁盘挂载点。字段与旧 agent disk_usage 完全一致 */
  type RealtimeDiskMount = {
    mountPoint: string;
    usedPercentage: number;
    usedStr: string;
    freeStr: string;
    totalStr: string;
    type: string;
    purpose: string;
    triggerHighPercentageUsed: boolean;
    triggerLowFreeBytes: boolean;
    triggerSizeWarning: boolean;
  };

  /** 系统内存信息。字段与旧 agent system_info 完全一致 */
  type RealtimeSystemMemory = {
    memoryPhysicTotalMb: number;
    memoryPhysicUsedMb: number;
    memorySwapTotalMb: number;
    memorySwapUsedMb: number;
  };

  /** GET /web/open/realtime/machines/{serverNameEng}/disk 的 result */
  type RealtimeDiskSnapshot = {
    serverNameEng: string;
    serverName: string;
    agentOnline: boolean;
    /** 秒级 */
    snapshotTime: number;
    /** 秒级 */
    serverTime: number;
    /** 秒 */
    freshness: number;
    stale: boolean;
    source: RealtimeSource;
    error: string | null;
    /** 每个挂载点一项 */
    snapshot: RealtimeDiskMount[];
    /** 可能为 null */
    system: RealtimeSystemMemory | null;
  };
}
