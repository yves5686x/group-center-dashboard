declare namespace API {
  interface ProgramUpdateResponse {
    success: boolean;
    message: string;
    currentPid: number;
    gitOutput: string;
  }

  interface MachineSystemInfo {
    memoryPhysicTotalMb: number;
    memoryPhysicUsedMb: number;

    memorySwapTotalMb: number;
    memorySwapUsedMb: number;
  }

  interface MachineDiskUsage {
    mountPoint: string;

    usedPercentage: number;

    usedStr: string;
    freeStr: string;
    totalStr: string;

    triggerHighPercentageUsed: boolean;
    triggerLowFreeBytes: boolean;
    triggerSizeWarning: boolean;

    type: string;
    purpose: string;
  }
  interface MachineDiskUsageResponse {
    result: number;
    diskUsage: API.MachineDiskUsage[];
  }

  interface DashboardGpuCount {
    result: number;
  }
  interface DashboardGpuUsageInfo {
    result: string;
    gpuName: string;
    coreUsage: number;
    memoryUsage: number;
    gpuMemoryTotalMB: number;
    gpuMemoryTotal: string;
    gpuPowerUsage: number;
    gpuTDP: number;
    gpuTemperature: number;
  }
  interface DashboardGpuTaskItemInfo {
    id: number;
    pid: number;
    name: string;

    debugMode: boolean;

    projectDirectory: string;
    projectName: string;
    pyFileName: string;

    runTime: string;
    startTimestamp: number;

    gpuMemoryUsage: number;
    gpuMemoryUsageMax: number;

    multiprocessingSpawn: boolean;

    worldSize: number;
    localRank: number;
    topPythonPid: number;

    condaEnv: string;
    screenSessionName: string;

    pythonBinPath: string;
    pythonVersion: string;

    torchVersion: string;
    torchCudaVersion: string;

    mainName: string;

    command: string;

    taskMainMemoryMB: number;

    cudaRoot: string;
    cudaVersion: string;
    cudaVisibleDevices: string;

    driverVersion: string;

    userEnvEpoch?: string;

    // 零占用率监控相关字段
    cpuPercent: number; // Python: round(process_obj.cpu_percent, 1)
    gpuUtilization: number; // Python: round(process_obj.gpu_utilization, 1)

    zeroTotalGpuAlertCount: number; // Python: process_obj.total_gpu_zero_alert_count
    zeroTotalCpuAlertCount: number; // Python: process_obj.total_cpu_zero_alert_count

    zeroAlreadyAlertedGpuUsage: boolean; // Python: process_obj.already_has_alerted_zero_gpu_usage
    zeroAlreadyAlertedCpuUsage: boolean; // Python: process_obj.already_has_alerted_zero_cpu_usage

    zeroMaxConsecutiveCount: number; // Python: process_obj.max_consecutive_zero_count
    zeroDetectionIntervalSeconds: number; // Python: detection_interval_seconds
  }
  interface DashboardGpuTaskItemInfoResponse {
    result: number;
    taskList: API.DashboardGpuTaskItemInfo[];
  }
}
