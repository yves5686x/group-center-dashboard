declare namespace API {
  type AllWebHookUser = {
    silentMode: SilentModeConfig;
    weCom: WeComUser;
    lark: LarkUser;
  };

  type authParams = {
    userName: string;
    password: string;
  };

  type AuthResponse = {
    haveError: boolean;
    result: string;
    accessKey: string;
    ipAddress: string;
    rememberAuthIp: boolean;
    serverVersion: string;
    isAuthenticated: boolean;
    isSucceed: boolean;
  };

  type ClientAlarmMessage = {
    title: string;
    content: string;
    source: string;
    urgent: boolean;
  };

  type ClientResponse = {
    serverVersion: string;
    haveError: boolean;
    result?: Record;
    isAuthenticated: boolean;
    isSucceed: boolean;
  };

  type DataDashBoardSite = {
    name: string;
    url: string;
    iconUrl: string;
    supportQrCode: boolean;
  };

  type DataDashBoardSiteClass = {
    className: string;
    classIconUrl: string;
    position: string;
    index: number;
    sites: DataDashBoardSite[];
  };

  type FrontEndMachine = {
    machineName: string;
    machineUrl: string;
    urlKeywords: string[];
    position: string;
    isGpu: boolean;
  };

  type getCustomPeriodStatisticsParams = {
    startTime: string;
    endTime: string;
  };

  type getDeviceTaskStatsParams = {
    /** Device name to get statistics for */
    deviceName: string;
  };

  type getGpuStatisticsParams = {
    /** Time period for statistics (default: ONE_WEEK) */
    timePeriod?: string;
  };

  type getMachineStatusParams = {
    /** English name of the machine */
    nameEng: string;
  };

  type getProjectStatisticsParams = {
    /** Time period for statistics (default: ONE_WEEK) */
    timePeriod?: string;
  };

  type getProxyServerParams = {
    /** English name of the proxy server */
    nameEng: string;
  };

  type getRecentTasksParams = {
    /** Number of hours to look back (default: 24) */
    hours?: number;
  };

  type getServerStatisticsParams = {
    /** Time period for statistics (default: ONE_WEEK) */
    timePeriod?: string;
  };

  type getSleepAnalysisParams = {
    timePeriod?: string;
  };

  type getSshKeyFileParams = {
    filename: string;
    userNameEng: string;
  };

  type getTaskByTaskIdParams = {
    /** Task ID for exact matching */
    taskId: string;
  };

  type getTimeTrendStatisticsParams = {
    /** Time period for trend analysis (default: ONE_WEEK) */
    timePeriod?: string;
  };

  type getUserActivityTimeDistributionCustomParams = {
    startTime: string;
    endTime: string;
  };

  type getUserActivityTimeDistributionParams = {
    /** Time period for statistics (default: ONE_WEEK) */
    timePeriod?: string;
  };

  type getUserStatisticsParams = {
    /** Time period for statistics (default: ONE_WEEK) */
    timePeriod?: string;
  };

  type getUserSubscriptionsParams = {
    userName: string;
  };

  type getUserTaskStatsParams = {
    /** Username to get statistics for */
    userName: string;
  };

  type GpuTaskInfo = {
    serverName: string;
    serverNameEng: string;
    taskId: string;
    messageType: string;
    taskType: string;
    taskStatus: string;
    taskUser: string;
    taskPid: number;
    taskMainMemory: number;
    allTaskMessage: string;
    gpuUsagePercent: number;
    gpuMemoryUsageString: string;
    gpuMemoryFreeString: string;
    gpuMemoryTotalString: string;
    gpuMemoryPercent: number;
    taskGpuId: number;
    taskGpuName: string;
    taskGpuMemoryGb: number;
    taskGpuMemoryHuman: string;
    taskGpuMemoryMaxGb: number;
    isMultiGpu: boolean;
    multiDeviceLocalRank: number;
    multiDeviceWorldSize: number;
    topPythonPid: number;
    cudaRoot: string;
    cudaVersion: string;
    isDebugMode: boolean;
    taskStartTime: number;
    taskFinishTime: number;
    taskRunningTimeString: string;
    taskRunningTimeInSeconds: number;
    projectDirectory: string;
    projectName: string;
    screenSessionName: string;
    pyFileName: string;
    pythonVersion: string;
    commandLine: string;
    condaEnvName: string;
    totalGpuCount: number;
    debugMode?: boolean;
    multiGpu?: boolean;
  };

  type GpuTaskQueryRequest = {
    filters: QueryFilter[];
    timeRange?: TimeRange;
    pagination: Pagination;
    includeStatistics: boolean;
    queryDescription: string;
  };

  type GroupUserConfig = {
    name: string;
    nameEng: string;
    keywords: string[];
    year: number;
    linuxUser: LinuxUser;
    webhook: AllWebHookUser;
  };

  type HardDiskUserUsage = {
    serverName: string;
    serverNameEng: string;
    userName: string;
  };

  type HealthCheckResponse = {
    success: boolean;
    message: string;
    results: Record<string, any>;
    detailedResults: Record;
  };

  type LarkUser = {
    enable: boolean;
    userId: string;
    userMobilePhone: string;
  };

  type LinuxUser = {
    uid: number;
    gid: number;
  };

  type MachineBaseConfig = {
    name: string;
    nameEng: string;
    host: string;
  };

  type MachineHeartbeat = {
    timestamp: number;
    serverNameEng: string;
  };

  type MachineMessage = {
    serverName: string;
    serverNameEng: string;
    content: string;
    at: string;
  };

  type MachineStatusResponse = {
    name: string;
    nameEng: string;
    host: string;
    position: string;
    isGpu: boolean;
    pingStatus: boolean;
    agentStatus: boolean;
    lastPingTime?: number;
    lastHeartbeatTime?: number;
    lastPingTimeFormatted?: string;
    lastHeartbeatTimeFormatted?: string;
    pingStatusText: string;
    agentStatusText: string;
  };

  type MachineUserMessage = {
    userName: string;
    content: string;
  };

  type MyRequestBody = {
    property1: string;
    property2: number;
  };

  type Pagination = {
    page: number;
    pageSize: number;
    sortBy:
      | 'ID'
      | 'TASK_USER'
      | 'PROJECT_NAME'
      | 'SERVER_NAME_ENG'
      | 'TASK_START_TIME'
      | 'TASK_FINISH_TIME'
      | 'TASK_RUNNING_TIME_IN_SECONDS'
      | 'GPU_USAGE_PERCENT'
      | 'GPU_MEMORY_PERCENT'
      | 'TASK_GPU_MEMORY_GB';
    sortOrder: 'ASC' | 'DESC';
    offset: number;
    sortDirection: string;
    sortColumn: string;
  };

  type postSshFileUploadParams = {
    userNameEng: string;
  };

  type ProjectSubscriptionRequest = {
    projectId: number;
    userName: string;
  };

  type ProxyServerInfo = {
    name: string;
    nameEng: string;
    type: string;
    host: string;
    port: number;
    priority: number;
    enable: boolean;
    requiresAuth: boolean;
    isAvailable: boolean;
    lastCheckTime?: number;
    responseTime?: number;
    successRate: string;
    totalChecks: number;
    lastError?: string;
    healthCheckEnabled: boolean;
    healthCheckInterval: number;
    healthCheckTimeout: number;
    testUrls: string[];
    urlTestResults: UrlTestResultInfo[];
  };

  type ProxyServerResponse = {
    success: boolean;
    message: string;
    server?: ProxyServerInfo;
  };

  type ProxyServersResponse = {
    success: boolean;
    message: string;
    servers: ProxyServerInfo[];
    totalCount: number;
    availableCount: number;
  };

  type ProxyStatusInfo = {
    totalProxies: number;
    availableProxies: number;
    availabilityRate: string;
    averageResponseTime?: number;
    lastCheckTime: number;
    isConfigEnabled: boolean;
    summaryDescription: string;
  };

  type ProxyStatusResponse = {
    success: boolean;
    message: string;
    status: ProxyStatusInfo;
    configEnabled: boolean;
    configFileExists: boolean;
  };

  type QueryFilter = {
    field:
      | 'ID'
      | 'TASK_USER'
      | 'PROJECT_NAME'
      | 'SERVER_NAME_ENG'
      | 'TASK_TYPE'
      | 'TASK_STATUS'
      | 'MESSAGE_TYPE'
      | 'IS_DEBUG_MODE'
      | 'IS_MULTI_GPU'
      | 'MULTI_DEVICE_WORLD_SIZE'
      | 'MULTI_DEVICE_LOCAL_RANK'
      | 'GPU_USAGE_PERCENT'
      | 'GPU_MEMORY_PERCENT'
      | 'TASK_GPU_MEMORY_GB'
      | 'TASK_GPU_ID'
      | 'TASK_GPU_NAME'
      | 'TASK_START_TIME'
      | 'TASK_FINISH_TIME'
      | 'TASK_RUNNING_TIME_IN_SECONDS'
      | 'PYTHON_VERSION'
      | 'CUDA_VERSION'
      | 'CONDA_ENV_NAME'
      | 'SCREEN_SESSION_NAME'
      | 'COMMAND_LINE'
      | 'PROJECT_DIRECTORY'
      | 'PY_FILE_NAME';
    operator:
      | 'EQUALS'
      | 'NOT_EQUALS'
      | 'LIKE'
      | 'GREATER_THAN'
      | 'LESS_THAN'
      | 'GREATER_EQUAL'
      | 'LESS_EQUAL'
      | 'BETWEEN';
    value: Record<string, any>;
    logic: 'AND' | 'OR';
    description: string;
  };

  type queryGpuTasksSimpleParams = {
    /** Exact server identifier, e.g. 4098a */
    serverNameEng?: string;
    /** Username for filtering tasks */
    userName?: string;
    /** Project name (supports fuzzy matching) */
    projectName?: string;
    /** Device name for filtering */
    deviceName?: string;
    /** Task type filter */
    taskType?: string;
    /** Filter by multi-GPU tasks (true/false) */
    isMultiGpu?: boolean;
    /** Start time for time range filtering (ISO format) */
    startTime?: string;
    /** End time for time range filtering (ISO format) */
    endTime?: string;
    /** Page number for pagination (default: 1) */
    page?: number;
    /** Page size for pagination (default: 20) */
    pageSize?: number;
    /** Sort field (default: TASK_START_TIME) */
    sortBy?:
      | 'ID'
      | 'TASK_USER'
      | 'PROJECT_NAME'
      | 'SERVER_NAME_ENG'
      | 'TASK_START_TIME'
      | 'TASK_FINISH_TIME'
      | 'TASK_RUNNING_TIME_IN_SECONDS'
      | 'GPU_USAGE_PERCENT'
      | 'GPU_MEMORY_PERCENT'
      | 'TASK_GPU_MEMORY_GB';
    /** Sort direction (default: DESC) */
    sortOrder?: 'ASC' | 'DESC';
    /** Include statistics in response (default: false) */
    includeStatistics?: boolean;
  };

  type ReloadConfigResponse = {
    success: boolean;
    message: string;
  };

  type SilentModeConfig = {
    enable: boolean;
    startTime: string;
    endTime: string;
    startTimeObj: TimeHM;
    endTimeObj: TimeHM;
    isValid: boolean;
    isSilentMode: boolean;
  };

  type TimeHM = {
    hour: number;
    minute: number;
  };

  type TimeRange = {
    startTime?: string;
    endTime?: string;
    startTimestamp?: number;
    endTimestamp?: number;
  };

  type UrlTestResultInfo = {
    url: string;
    name: string;
    nameEng: string;
    isSuccess: boolean;
    responseTime?: number;
    statusCode?: number;
    error?: string;
    testTime: number;
  };

  type WeComUser = {
    enable: boolean;
    userId: string;
    userMobilePhone: string;
  };
}
